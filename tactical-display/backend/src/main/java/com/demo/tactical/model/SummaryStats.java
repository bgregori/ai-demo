package com.demo.tactical.model;

import java.util.Map;

public class SummaryStats {
    public int totalImagesAnalyzed;
    public int totalDetections;
    public Map<String, Integer> detectionsByClass;
    public float averageConfidence;

    public SummaryStats() {
    }

    public SummaryStats(int totalImagesAnalyzed, int totalDetections,
                       Map<String, Integer> detectionsByClass, float averageConfidence) {
        this.totalImagesAnalyzed = totalImagesAnalyzed;
        this.totalDetections = totalDetections;
        this.detectionsByClass = detectionsByClass;
        this.averageConfidence = averageConfidence;
    }
}
