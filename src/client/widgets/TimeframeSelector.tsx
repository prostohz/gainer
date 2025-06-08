import { TTimeframe } from '../../shared/types';

export const TimeframeSelector = ({
  selectedTimeFrame,
  setSelectedTimeFrame,
}: {
  selectedTimeFrame: TTimeframe;
  setSelectedTimeFrame: (timeFrame: TTimeframe) => void;
}) => {
  const TIMEFRAMES: TTimeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  return (
    <select
      className="select select-bordered w-full"
      value={selectedTimeFrame}
      onChange={(e) => setSelectedTimeFrame(e.target.value as TTimeframe)}
    >
      {TIMEFRAMES.map((timeFrame) => (
        <option key={timeFrame} value={timeFrame}>
          {timeFrame}
        </option>
      ))}
    </select>
  );
};
