package com.demo.tactical;

import com.demo.tactical.model.Detection;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.io.InputStream;
import java.util.*;

@ApplicationScoped
public class YoloPostProcessor {
    private static final Logger LOG = Logger.getLogger(YoloPostProcessor.class);

    private final Map<Integer, String> classNames;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public YoloPostProcessor() {
        this.classNames = loadClassNames();
    }

    private Map<Integer, String> loadClassNames() {
        Map<Integer, String> names = new HashMap<>();
        try (InputStream is = getClass().getResourceAsStream("/xview-classes.json")) {
            JsonNode root = objectMapper.readTree(is);
            Iterator<String> fieldNames = root.fieldNames();
            while (fieldNames.hasNext()) {
                String key = fieldNames.next();
                names.put(Integer.parseInt(key), root.get(key).asText());
            }
            LOG.info("Loaded " + names.size() + " class names");
        } catch (Exception e) {
            LOG.error("Failed to load class names", e);
            throw new RuntimeException("Failed to load class names", e);
        }
        return names;
    }

    public List<Detection> processOutput(float[] outputData, int[] shape, int originalWidth, int originalHeight,
                                        float confThreshold, float nmsThreshold) {
        // Check if this is pre-processed output (shape: [1, N, 6]) or raw YOLO output (shape: [1, 64, 8400])
        if (shape.length == 3 && shape[2] == 6) {
            // Pre-processed output: [batch, num_detections, 6] where 6 = [x1, y1, x2, y2, confidence, class_id]
            return processPreProcessedOutput(outputData, shape, originalWidth, originalHeight, confThreshold);
        }

        // Original YOLO output shape: [1, 64, 8400]
        // 64 = 4 box coords (cx, cy, w, h) + 60 class scores
        // 8400 = number of predictions

        int numPredictions = shape[2];  // 8400
        int numClasses = 60;

        List<RawPrediction> rawPredictions = new ArrayList<>();

        // Parse each prediction
        for (int i = 0; i < numPredictions; i++) {
            // Extract box coordinates (first 4 values)
            float cx = outputData[i];  // center x
            float cy = outputData[numPredictions + i];  // center y
            float w = outputData[2 * numPredictions + i];  // width
            float h = outputData[3 * numPredictions + i];  // height

            // Extract class scores (next 60 values)
            float maxScore = 0;
            int maxClass = 0;
            for (int c = 0; c < numClasses; c++) {
                float score = outputData[(4 + c) * numPredictions + i];
                if (score > maxScore) {
                    maxScore = score;
                    maxClass = c;
                }
            }

            // Filter by confidence threshold
            if (maxScore >= confThreshold) {
                rawPredictions.add(new RawPrediction(cx, cy, w, h, maxScore, maxClass));
            }
        }

        LOG.debug("Filtered to " + rawPredictions.size() + " predictions above threshold");

        // Apply Non-Maximum Suppression
        List<RawPrediction> nmsResults = applyNMS(rawPredictions, nmsThreshold);
        LOG.debug("After NMS: " + nmsResults.size() + " detections");

        // Convert to Detection objects with scaled coordinates
        List<Detection> detections = new ArrayList<>();
        float scaleX = (float) originalWidth / 960.0f;
        float scaleY = (float) originalHeight / 960.0f;

        for (RawPrediction pred : nmsResults) {
            // Convert from center-width-height to x-y-width-height and scale
            float x = (pred.cx - pred.w / 2) * scaleX;
            float y = (pred.cy - pred.h / 2) * scaleY;
            float width = pred.w * scaleX;
            float height = pred.h * scaleY;

            Detection.BoundingBox box = new Detection.BoundingBox(x, y, width, height);
            String className = classNames.getOrDefault(pred.classId, "Unknown");
            detections.add(new Detection(pred.classId, className, pred.confidence, box));
        }

        return detections;
    }

    private List<Detection> processPreProcessedOutput(float[] outputData, int[] shape, int originalWidth, int originalHeight,
                                                     float confThreshold) {
        // Pre-processed output shape: [1, num_detections, 6]
        // Each detection: [x1, y1, x2, y2, confidence, class_id]

        int numDetections = shape[1];  // e.g., 300
        List<Detection> detections = new ArrayList<>();

        LOG.info("Processing pre-processed output with " + numDetections + " detections");

        // Track unique class IDs to see what the model is detecting
        java.util.Set<Integer> uniqueClasses = new java.util.HashSet<>();

        for (int i = 0; i < numDetections; i++) {
            int offset = i * 6;

            float x1 = outputData[offset];
            float y1 = outputData[offset + 1];
            float x2 = outputData[offset + 2];
            float y2 = outputData[offset + 3];
            float confidence = outputData[offset + 4];
            int classId = (int) outputData[offset + 5];

            // Log first detection to see coordinate format
            if (i == 0) {
                LOG.info("First detection: x1=" + x1 + ", y1=" + y1 + ", x2=" + x2 + ", y2=" + y2 +
                        ", conf=" + confidence + ", class=" + classId);
            }

            // Track all class IDs seen
            uniqueClasses.add(classId);

            // Filter by confidence threshold
            if (confidence < confThreshold) {
                continue;
            }

            // The coordinates appear to be in model input space (960x960)
            // Scale them to original image dimensions
            float MODEL_SIZE = 960.0f;
            float scaleX = originalWidth / MODEL_SIZE;
            float scaleY = originalHeight / MODEL_SIZE;

            float x = x1 * scaleX;
            float y = y1 * scaleY;
            float width = (x2 - x1) * scaleX;
            float height = (y2 - y1) * scaleY;

            Detection.BoundingBox box = new Detection.BoundingBox(x, y, width, height);
            String className = classNames.getOrDefault(classId, "Unknown");
            detections.add(new Detection(classId, className, confidence, box));
        }

        LOG.info("Unique class IDs detected: " + uniqueClasses);
        LOG.info("Filtered to " + detections.size() + " detections above confidence threshold");
        return detections;
    }

    private List<RawPrediction> applyNMS(List<RawPrediction> predictions, float iouThreshold) {
        // Sort by confidence (descending)
        predictions.sort((a, b) -> Float.compare(b.confidence, a.confidence));

        List<RawPrediction> results = new ArrayList<>();
        boolean[] suppressed = new boolean[predictions.size()];

        for (int i = 0; i < predictions.size(); i++) {
            if (suppressed[i]) continue;

            RawPrediction current = predictions.get(i);
            results.add(current);

            // Suppress overlapping boxes
            for (int j = i + 1; j < predictions.size(); j++) {
                if (suppressed[j]) continue;

                RawPrediction other = predictions.get(j);
                if (current.classId == other.classId && calculateIoU(current, other) > iouThreshold) {
                    suppressed[j] = true;
                }
            }
        }

        return results;
    }

    private float calculateIoU(RawPrediction a, RawPrediction b) {
        // Convert to x1, y1, x2, y2
        float ax1 = a.cx - a.w / 2;
        float ay1 = a.cy - a.h / 2;
        float ax2 = a.cx + a.w / 2;
        float ay2 = a.cy + a.h / 2;

        float bx1 = b.cx - b.w / 2;
        float by1 = b.cy - b.h / 2;
        float bx2 = b.cx + b.w / 2;
        float by2 = b.cy + b.h / 2;

        // Calculate intersection
        float ix1 = Math.max(ax1, bx1);
        float iy1 = Math.max(ay1, by1);
        float ix2 = Math.min(ax2, bx2);
        float iy2 = Math.min(ay2, by2);

        float intersectionArea = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);

        // Calculate union
        float areaA = a.w * a.h;
        float areaB = b.w * b.h;
        float unionArea = areaA + areaB - intersectionArea;

        return intersectionArea / unionArea;
    }

    private static class RawPrediction {
        float cx, cy, w, h;
        float confidence;
        int classId;

        RawPrediction(float cx, float cy, float w, float h, float confidence, int classId) {
            this.cx = cx;
            this.cy = cy;
            this.w = w;
            this.h = h;
            this.confidence = confidence;
            this.classId = classId;
        }
    }
}
