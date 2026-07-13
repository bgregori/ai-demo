package com.demo.tactical.model;

public class ImageInfo {
    public String key;
    public String name;
    public long size;
    public boolean analyzed;

    public ImageInfo() {
    }

    public ImageInfo(String key, String name, long size, boolean analyzed) {
        this.key = key;
        this.name = name;
        this.size = size;
        this.analyzed = analyzed;
    }
}
