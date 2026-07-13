// Mock xView satellite images (using real sample images from public/sample-images/)
export const mockImages = [
  { key: 'sample-images/10.png', name: '10.png', size: 14680064, analyzed: false },
  { key: 'sample-images/102.png', name: '102.png', size: 16777216, analyzed: false },
  { key: 'sample-images/104.png', name: '104.png', size: 15728640, analyzed: false },
  { key: 'sample-images/950.png', name: '950.png', size: 9223372, analyzed: false },
  { key: 'sample-images/1036.png', name: '1036.png', size: 15728640, analyzed: false },
  { key: 'sample-images/1037.png', name: '1037.png', size: 15728640, analyzed: false },
  { key: 'sample-images/1038.png', name: '1038.png', size: 15728640, analyzed: false },
  { key: 'sample-images/1040.png', name: '1040.png', size: 13631488, analyzed: false },
];

// Mock detection results generator
function generateMockDetections(imageKey, seed) {
  const classNames = [
    'Fixed-wing Aircraft',
    'Small Aircraft',
    'Helicopter',
    'Passenger Vehicle',
    'Small Car',
    'Bus',
    'Pickup Truck',
    'Truck',
    'Building',
    'Storage Tank',
    'Container Ship',
    'Motorboat',
    'Tower crane',
    'Excavator',
  ];

  // Use seed to generate consistent random results for each image
  const random = (min, max) => {
    const x = Math.sin(seed++) * 10000;
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
  };

  const numDetections = random(5, 15);
  const detections = [];

  for (let i = 0; i < numDetections; i++) {
    const className = classNames[random(0, classNames.length - 1)];
    const confidence = 0.4 + random(0, 600) / 1000; // 0.4 to 1.0

    const x = random(50, 2500);
    const y = random(50, 1500);
    const width = random(30, 150);
    const height = random(30, 150);

    detections.push({
      classId: classNames.indexOf(className),
      className,
      confidence,
      box: { x, y, width, height },
    });
  }

  return detections;
}

// Generate mock analysis results for each image
export const mockAnalysisResults = {};
mockImages.forEach((img, index) => {
  const seed = index * 100;
  mockAnalysisResults[img.key] = {
    imageId: img.key,
    imageName: img.name,
    imageWidth: 3000,
    imageHeight: 2000,
    detections: generateMockDetections(img.key, seed),
    processingTimeMs: 200 + Math.floor(Math.random() * 300),
  };
});

// Mock summary statistics
export function generateMockSummary(analyzedKeys) {
  const detectionsByClass = {};
  let totalDetections = 0;
  let totalConfidence = 0;

  analyzedKeys.forEach((key) => {
    const result = mockAnalysisResults[key];
    if (result) {
      result.detections.forEach((detection) => {
        totalDetections++;
        totalConfidence += detection.confidence;
        detectionsByClass[detection.className] =
          (detectionsByClass[detection.className] || 0) + 1;
      });
    }
  });

  return {
    totalImagesAnalyzed: analyzedKeys.length,
    totalDetections,
    detectionsByClass,
    averageConfidence: totalDetections > 0 ? totalConfidence / totalDetections : 0,
  };
}
