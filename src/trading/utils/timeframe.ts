import { TTimeframe } from '../types';

export const timeframeToSeconds = (timeframe: TTimeframe): number => {
  const match = timeframe.match(/(\d+)([smhdwM])/);
  if (!match) return 0;

  const [, value, unit] = match;
  const numValue = parseInt(value);

  if (unit === 's') return numValue;
  if (unit === 'm') return numValue * 60;
  if (unit === 'h') return numValue * 60 * 60;
  if (unit === 'd') return numValue * 60 * 60 * 24;
  if (unit === 'w') return numValue * 60 * 60 * 24 * 7;
  if (unit === 'M') return numValue * 60 * 60 * 24 * 30;

  return 0;
};

export const timeframeToMilliseconds = (timeframe: TTimeframe): number => {
  return timeframeToSeconds(timeframe) * 1000;
};
