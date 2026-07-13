package com.demo.tactical;

import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import org.jboss.logging.Logger;

import java.util.Random;

/**
 * Mock inference service for local testing without OpenVINO Model Server.
 * Returns realistic fake detections for testing the tactical display.
 */
@Alternative
@Priority(1)
@IfBuildProperty(name = "tactical.mock.enabled", stringValue = "true")
@ApplicationScoped
public class MockInferenceService extends InferenceService {

    private static final Logger LOG = Logger.getLogger(MockInferenceService.class);
    private final Random random = new Random();

    /**
     * Override the runInference method to return fake detection data.
     * This is called after preprocessing, so we just need to return mock inference results.
     */
    @Override
    InferenceResult runInference(float[] inputTensor) throws Exception {
        LOG.info("Using MOCK inference - returning fake detections");

        // Simulate processing delay
        Thread.sleep(100 + random.nextInt(200));

        // Return mock detection data in [1, 300, 6] format
        // Format: [batch, num_detections, (x1, y1, x2, y2, confidence, class_id)]

        int numDetections = 5 + random.nextInt(15); // 5-20 detections
        float[] data = new float[300 * 6]; // Max 300 detections

        for (int i = 0; i < numDetections; i++) {
            int offset = i * 6;

            // Random bounding box (normalized 0-1)
            float x1 = random.nextFloat() * 0.8f;
            float y1 = random.nextFloat() * 0.8f;
            float x2 = x1 + 0.05f + random.nextFloat() * 0.15f; // Width: 5-20%
            float y2 = y1 + 0.05f + random.nextFloat() * 0.15f; // Height: 5-20%

            // Random confidence (0.3-0.95)
            float confidence = 0.3f + random.nextFloat() * 0.65f;

            // Random class ID (mix of buildings, aircraft, vehicles, ships)
            int classId = pickRandomClass();

            data[offset] = x1;
            data[offset + 1] = y1;
            data[offset + 2] = x2;
            data[offset + 3] = y2;
            data[offset + 4] = confidence;
            data[offset + 5] = classId;
        }

        // Pad remaining with zeros
        for (int i = numDetections * 6; i < 300 * 6; i++) {
            data[i] = 0.0f;
        }

        int[] shape = {1, 300, 6};

        LOG.infof("Mock inference generated %d fake detections", numDetections);
        return new InferenceResult(data, shape);
    }

    private int pickRandomClass() {
        // Weighted random class selection
        float r = random.nextFloat();

        if (r < 0.4f) {
            // 40% Buildings (class 48)
            return 48;
        } else if (r < 0.55f) {
            // 15% Aircraft (classes 0-3)
            return random.nextInt(4);
        } else if (r < 0.75f) {
            // 20% Vehicles (classes 4-16)
            return 4 + random.nextInt(13);
        } else if (r < 0.90f) {
            // 15% Ships (classes 23-32)
            return 23 + random.nextInt(10);
        } else {
            // 10% Other rare classes
            return 33 + random.nextInt(27);
        }
    }
}
