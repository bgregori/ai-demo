package com.demo.tactical;

import com.demo.tactical.config.TacticalConfig;
import com.demo.tactical.model.ImageInfo;
import io.minio.*;
import io.minio.messages.Item;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class StorageService {
    private static final Logger LOG = Logger.getLogger(StorageService.class);

    @Inject
    TacticalConfig config;

    private MinioClient minioClient;

    private MinioClient getClient() {
        if (minioClient == null) {
            minioClient = MinioClient.builder()
                    .endpoint(config.minio().endpoint())
                    .credentials(config.minio().accessKey(), config.minio().secretKey())
                    .build();
        }
        return minioClient;
    }

    public List<ImageInfo> listImages() {
        List<ImageInfo> images = new ArrayList<>();
        try {
            Iterable<Result<Item>> results = getClient().listObjects(
                    ListObjectsArgs.builder()
                            .bucket(config.minio().bucket())
                            .prefix(config.minio().imagesPrefix())
                            .recursive(true)
                            .build()
            );

            for (Result<Item> result : results) {
                Item item = result.get();
                if (item.objectName().toLowerCase().endsWith(".png")) {
                    String name = item.objectName().substring(item.objectName().lastIndexOf('/') + 1);
                    images.add(new ImageInfo(
                            item.objectName(),
                            name,
                            item.size(),
                            false  // Will be set by analysis service
                    ));
                }
            }
        } catch (Exception e) {
            LOG.error("Failed to list images from MinIO", e);
            throw new RuntimeException("Failed to list images", e);
        }
        return images;
    }

    public InputStream getImage(String objectKey) {
        try {
            return getClient().getObject(
                    GetObjectArgs.builder()
                            .bucket(config.minio().bucket())
                            .object(objectKey)
                            .build()
            );
        } catch (Exception e) {
            LOG.error("Failed to get image: " + objectKey, e);
            throw new RuntimeException("Failed to get image", e);
        }
    }

    public void uploadImage(String objectKey, byte[] imageData, String contentType) {
        try {
            getClient().putObject(
                    PutObjectArgs.builder()
                            .bucket(config.minio().bucket())
                            .object(objectKey)
                            .stream(new ByteArrayInputStream(imageData), imageData.length, -1)
                            .contentType(contentType)
                            .build()
            );
            LOG.info("Uploaded image: " + objectKey);
        } catch (Exception e) {
            LOG.error("Failed to upload image: " + objectKey, e);
            throw new RuntimeException("Failed to upload image", e);
        }
    }
}
