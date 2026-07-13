package com.demo.tactical;

import com.demo.tactical.config.TacticalConfig;
import com.demo.tactical.model.AnalysisResult;
import com.demo.tactical.model.Detection;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

@ApplicationScoped
public class InferenceService {
    private static final Logger LOG = Logger.getLogger(InferenceService.class);
    private static final int MODEL_INPUT_SIZE = 960;

    @Inject
    TacticalConfig config;

    @Inject
    StorageService storageService;

    @Inject
    YoloPostProcessor postProcessor;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public AnalysisResult analyzeImage(String imageKey) {
        long startTime = System.currentTimeMillis();

        try {
            // Fetch image from MinIO
            InputStream imageStream = storageService.getImage(imageKey);
            BufferedImage originalImage = ImageIO.read(imageStream);

            if (originalImage == null) {
                throw new RuntimeException("Failed to read image: " + imageKey);
            }

            int originalWidth = originalImage.getWidth();
            int originalHeight = originalImage.getHeight();
            LOG.info("Processing image: " + imageKey + " (" + originalWidth + "x" + originalHeight + ")");

            // Preprocess: resize to 640x640 and convert to normalized tensor
            float[] inputTensor = preprocessImage(originalImage);

            // Call OpenVINO inference endpoint
            InferenceResult inferenceResult = runInference(inputTensor);

            // Post-process: NMS, box decoding, class mapping
            List<Detection> detections = postProcessor.processOutput(
                    inferenceResult.data,
                    inferenceResult.shape,
                    originalWidth,
                    originalHeight,
                    config.model().confidenceThreshold(),
                    config.model().nmsThreshold()
            );

            long processingTime = System.currentTimeMillis() - startTime;
            LOG.info("Analysis complete: " + detections.size() + " detections in " + processingTime + "ms");

            String imageName = imageKey.substring(imageKey.lastIndexOf('/') + 1);
            return new AnalysisResult(
                    imageKey,
                    imageName,
                    originalWidth,
                    originalHeight,
                    detections,
                    processingTime
            );

        } catch (Exception e) {
            LOG.error("Failed to analyze image: " + imageKey, e);
            throw new RuntimeException("Failed to analyze image", e);
        }
    }

    private float[] preprocessImage(BufferedImage originalImage) {
        // Resize to 640x640
        BufferedImage resizedImage = new BufferedImage(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = resizedImage.createGraphics();
        g.drawImage(originalImage, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, null);
        g.dispose();

        // Convert to NCHW float tensor and normalize to [0, 1]
        float[] tensor = new float[3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE];
        int idx = 0;

        // Red channel
        for (int y = 0; y < MODEL_INPUT_SIZE; y++) {
            for (int x = 0; x < MODEL_INPUT_SIZE; x++) {
                int rgb = resizedImage.getRGB(x, y);
                tensor[idx++] = ((rgb >> 16) & 0xFF) / 255.0f;
            }
        }

        // Green channel
        for (int y = 0; y < MODEL_INPUT_SIZE; y++) {
            for (int x = 0; x < MODEL_INPUT_SIZE; x++) {
                int rgb = resizedImage.getRGB(x, y);
                tensor[idx++] = ((rgb >> 8) & 0xFF) / 255.0f;
            }
        }

        // Blue channel
        for (int y = 0; y < MODEL_INPUT_SIZE; y++) {
            for (int x = 0; x < MODEL_INPUT_SIZE; x++) {
                int rgb = resizedImage.getRGB(x, y);
                tensor[idx++] = (rgb & 0xFF) / 255.0f;
            }
        }

        return tensor;
    }

    InferenceResult runInference(float[] inputTensor) throws Exception {
        // Build OpenVINO v2 inference request
        ObjectNode request = objectMapper.createObjectNode();
        ArrayNode inputs = request.putArray("inputs");
        ObjectNode input = inputs.addObject();
        input.put("name", "images");
        input.put("datatype", "FP32");

        ArrayNode inputShape = input.putArray("shape");
        inputShape.add(1).add(3).add(MODEL_INPUT_SIZE).add(MODEL_INPUT_SIZE);

        ArrayNode data = input.putArray("data");
        for (float value : inputTensor) {
            data.add(value);
        }

        // Send request
        String url = config.model().url() + "/v2/models/" + config.model().name() + "/infer";
        String requestBody = objectMapper.writeValueAsString(request);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        LOG.debug("Sending inference request to: " + url);
        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Inference failed with status: " + response.statusCode() + " body: " + response.body());
        }

        // Parse response
        JsonNode responseJson = objectMapper.readTree(response.body());
        JsonNode outputs = responseJson.get("outputs");
        if (outputs == null || outputs.size() == 0) {
            throw new RuntimeException("No outputs in inference response");
        }

        JsonNode output = outputs.get(0);
        JsonNode outputData = output.get("data");
        JsonNode shapeNode = output.get("shape");

        // Parse shape
        int[] shape = new int[shapeNode.size()];
        for (int i = 0; i < shapeNode.size(); i++) {
            shape[i] = shapeNode.get(i).asInt();
        }

        // Parse data
        float[] outputTensor = new float[outputData.size()];
        for (int i = 0; i < outputData.size(); i++) {
            outputTensor[i] = (float) outputData.get(i).asDouble();
        }

        LOG.debug("Received output tensor with shape " + java.util.Arrays.toString(shape) + " (" + outputTensor.length + " values)");
        return new InferenceResult(outputTensor, shape);
    }

    static class InferenceResult {
        final float[] data;
        final int[] shape;

        InferenceResult(float[] data, int[] shape) {
            this.data = data;
            this.shape = shape;
        }
    }
}
