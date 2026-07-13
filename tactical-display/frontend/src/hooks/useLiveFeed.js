import { useState, useEffect, useRef } from 'react';

export function useLiveFeed(images, onAnalyze, interval = 8000) {
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isActive || images.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % images.length;
        const nextImage = images[nextIndex];

        // Auto-analyze the next image
        if (nextImage && !nextImage.analyzed) {
          onAnalyze(nextImage.key);
        }

        return nextIndex;
      });
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, images, onAnalyze, interval]);

  const toggle = () => setIsActive(!isActive);

  return {
    isActive,
    toggle,
    currentIndex,
  };
}
