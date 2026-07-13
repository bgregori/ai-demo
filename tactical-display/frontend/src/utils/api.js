import { mockImages, mockAnalysisResults, generateMockSummary } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Track which images have been analyzed in mock mode
let analyzedImageKeys = [];

// Simulate network delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const realApi = {
  async listImages() {
    const response = await fetch(`${API_BASE_URL}/images`);
    if (!response.ok) {
      throw new Error('Failed to fetch images');
    }
    return response.json();
  },

  getImageUrl(imageKey) {
    return `${API_BASE_URL}/images/${encodeURIComponent(imageKey)}/raw`;
  },

  async analyzeImage(imageKey) {
    const response = await fetch(`${API_BASE_URL}/analyze?imageKey=${encodeURIComponent(imageKey)}`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to analyze image');
    }
    return response.json();
  },

  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    return response.json();
  },

  async getSummary() {
    const response = await fetch(`${API_BASE_URL}/summary`);
    if (!response.ok) {
      throw new Error('Failed to fetch summary');
    }
    return response.json();
  },

  async getHealth() {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Failed to fetch health');
    }
    return response.json();
  },
};

const mockApi = {
  async listImages() {
    await delay(200);
    return [...mockImages];
  },

  getImageUrl(imageKey) {
    // For mock mode, return the path to the real sample image in public/
    return `/${imageKey}`;
  },

  async analyzeImage(imageKey) {
    await delay(800); // Simulate processing time

    if (!mockAnalysisResults[imageKey]) {
      throw new Error('Image not found');
    }

    // Track analyzed images
    if (!analyzedImageKeys.includes(imageKey)) {
      analyzedImageKeys.push(imageKey);
    }

    return mockAnalysisResults[imageKey];
  },

  async uploadImage(file) {
    await delay(1000);

    const newImage = {
      key: `xview-images/${file.name}`,
      name: file.name,
      size: file.size,
      analyzed: false,
    };

    // Add to mock images
    mockImages.push(newImage);

    // Generate mock analysis result
    const seed = mockImages.length * 100;
    mockAnalysisResults[newImage.key] = {
      imageId: newImage.key,
      imageName: newImage.name,
      imageWidth: 3000,
      imageHeight: 2000,
      detections: [],
      processingTimeMs: 250,
    };

    return {
      success: true,
      imageKey: newImage.key,
      filename: file.name,
    };
  },

  async getSummary() {
    await delay(100);
    return generateMockSummary(analyzedImageKeys);
  },

  async getHealth() {
    await delay(50);
    return {
      status: 'UP',
      timestamp: Date.now(),
      modelUrl: 'http://mock-model-server:8080',
      cachedResults: analyzedImageKeys.length,
    };
  },
};

export const api = USE_MOCK ? mockApi : realApi;
