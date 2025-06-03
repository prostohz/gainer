import { useEffect, useState } from 'react';

export const useAvailableHeight = (container: HTMLElement | null) => {
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      if (container) {
        const containerRect = container.getBoundingClientRect();
        setContainerHeight(containerRect.height);
      }
    };

    const resizeObserver = new ResizeObserver(updateHeight);
    if (container) {
      resizeObserver.observe(container);
      updateHeight(); // Первоначальный расчет
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [container]);

  return containerHeight;
};
