package com.demo.tactical;

import com.demo.tactical.model.ImageInfo;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import org.jboss.logging.Logger;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * Mock storage service for local testing without MinIO server.
 * Uses local filesystem with sample xView images.
 */
@Alternative
@Priority(1)
@IfBuildProperty(name = "tactical.mock.enabled", stringValue = "true")
@ApplicationScoped
public class MockStorageService extends StorageService {

    private static final Logger LOG = Logger.getLogger(MockStorageService.class);
    private static final String SAMPLE_IMAGES_DIR = "src/main/resources/sample-images";

    @Override
    public List<ImageInfo> listImages() {
        LOG.info("Using MOCK storage - listing local sample images");

        List<ImageInfo> images = new ArrayList<>();
        Path sampleDir = Paths.get(SAMPLE_IMAGES_DIR);

        if (!Files.exists(sampleDir)) {
            LOG.warnf("Sample images directory not found: %s", sampleDir.toAbsolutePath());
            // Return hardcoded fallback
            return createFallbackImageList();
        }

        try {
            Files.list(sampleDir)
                .filter(path -> path.toString().endsWith(".png"))
                .forEach(path -> {
                    String fileName = path.getFileName().toString();
                    try {
                        long size = Files.size(path);
                        images.add(new ImageInfo(
                            "xview-images/" + fileName,
                            fileName,
                            size,
                            false
                        ));
                    } catch (IOException e) {
                        LOG.warn("Failed to get size for: " + fileName, e);
                    }
                });

            LOG.infof("Found %d sample images", images.size());
        } catch (IOException e) {
            LOG.error("Failed to list sample images", e);
            return createFallbackImageList();
        }

        return images;
    }

    @Override
    public InputStream getImage(String objectKey) {
        LOG.infof("Using MOCK storage - loading local image: %s", objectKey);

        // Extract filename from object key
        String fileName = objectKey.substring(objectKey.lastIndexOf('/') + 1);
        Path imagePath = Paths.get(SAMPLE_IMAGES_DIR, fileName);

        if (!Files.exists(imagePath)) {
            LOG.errorf("Sample image not found: %s", imagePath.toAbsolutePath());
            throw new RuntimeException("Image not found: " + fileName);
        }

        try {
            byte[] imageBytes = Files.readAllBytes(imagePath);
            LOG.infof("Loaded sample image %s (%d bytes)", fileName, imageBytes.length);
            return new ByteArrayInputStream(imageBytes);
        } catch (IOException e) {
            LOG.error("Failed to read sample image: " + fileName, e);
            throw new RuntimeException("Failed to read image: " + fileName, e);
        }
    }

    @Override
    public void uploadImage(String objectKey, byte[] imageData, String contentType) {
        LOG.infof("Using MOCK storage - would upload image: %s (%d bytes, type: %s)",
                  objectKey, imageData.length, contentType);
        LOG.info("Mock mode: image upload skipped");
    }

    private List<ImageInfo> createFallbackImageList() {
        return List.of(
            new ImageInfo("xview-images/1.png", "1.png", 1024000, false),
            new ImageInfo("xview-images/5.png", "5.png", 2048000, false),
            new ImageInfo("xview-images/13.png", "13.png", 1536000, false),
            new ImageInfo("xview-images/20.png", "20.png", 1843200, false),
            new ImageInfo("xview-images/311.png", "311.png", 2211840, false)
        );
    }
}
