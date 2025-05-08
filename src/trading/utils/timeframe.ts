import { TTimeframe } from '../types';

export const timeframeToSeconds = (timeframe: TTimeframe): number => {
  const [tf, unit] = timeframe.split('');

  if (unit === 's') return parseInt(tf);
  if (unit === 'm') return parseInt(tf) * 60;
  if (unit === 'h') return parseInt(tf) * 60 * 60;
  if (unit === 'd') return parseInt(tf) * 60 * 60 * 24;
  if (unit === 'w') return parseInt(tf) * 60 * 60 * 24 * 7;
  if (unit === 'M') return parseInt(tf) * 60 * 60 * 24 * 30;

  return 0;
};
