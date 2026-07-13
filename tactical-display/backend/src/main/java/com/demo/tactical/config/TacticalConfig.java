package com.demo.tactical.config;

import io.smallrye.config.ConfigMapping;

@ConfigMapping(prefix = "tactical")
public interface TacticalConfig {

    MockConfig mock();
    ModelConfig model();
    MinioConfig minio();

    interface ModelConfig {
        String url();
        String name();
        float confidenceThreshold();
        float nmsThreshold();
    }

    interface MinioConfig {
        String endpoint();
        String accessKey();
        String secretKey();
        String bucket();
        String imagesPrefix();
    }

    interface MockConfig {
        boolean enabled();
    }
}
