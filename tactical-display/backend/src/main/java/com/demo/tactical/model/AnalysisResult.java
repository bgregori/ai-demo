package com.demo.tactical.model;

import java.util.List;

public class AnalysisResult {
    public String imageId;
    public String imageName;
    public int imageWidth;
    public int imageHeight;
    public List<Detection> detections;
    public long processingTimeMs;

    public AnalysisResult() {
    }

    public AnalysisResult(String imageId, String imageName, int imageWidth, int imageHeight,
                         List<Detection> detections, long processingTimeMs) {
        this.imageId = imageId;
        this.imageName = imageName;
        this.imageWidth = imageWidth;
        this.imageHeight = imageHeight;
        this.detections = detections;
        this.processingTimeMs = processingTimeMs;
    }
}
