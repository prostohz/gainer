export const getColorForStrength = (strength: number): string => {
  if (strength >= 80) {
    return 'rgba(0, 128, 0, 0.8)'; // Зеленый (80-100%)
  } else if (strength >= 60) {
    return 'rgba(34, 139, 34, 0.8)'; // Лесной зеленый (60-80%)
  } else if (strength >= 40) {
    return 'rgba(255, 165, 0, 0.8)'; // Оранжевый (40-60%)
  } else if (strength >= 20) {
    return 'rgba(255, 69, 0, 0.8)'; // Оранжево-красный (20-40%)
  } else {
    return 'rgba(255, 0, 0, 0.8)'; // Красный (0-20%)
  }
};
