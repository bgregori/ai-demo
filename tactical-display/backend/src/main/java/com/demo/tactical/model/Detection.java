package com.demo.tactical.model;

public class Detection {
    public int classId;
    public String className;
    public float confidence;
    public BoundingBox box;

    public Detection() {
    }

    public Detection(int classId, String className, float confidence, BoundingBox box) {
        this.classId = classId;
        this.className = className;
        this.confidence = confidence;
        this.box = box;
    }

    public static class BoundingBox {
        public float x;
        public float y;
        public float width;
        public float height;

        public BoundingBox() {
        }

        public BoundingBox(float x, float y, float width, float height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }
    }
}
