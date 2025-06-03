import { useEffect } from 'react';

import { TCorrelationReportFilters } from '../../../shared/types';

type TProps = {
  values: TCorrelationReportFilters;
  onChange: (value: TCorrelationReportFilters) => void;
};

export const Filters = ({ values, onChange }: TProps) => {
  const { usdtOnly, ignoreUsdtUsdc, maxPValue, maxHalfLife, minVolume } = values;

  const setField = (field: keyof TCorrelationReportFilters, value: boolean | number) => {
    onChange({ ...values, [field]: value });
  };

  const setUsdtOnly = (value: boolean) => setField('usdtOnly', value);
  const setIgnoreUsdtUsdc = (value: boolean) => setField('ignoreUsdtUsdc', value);
  const setMaxPValue = (value: number) => setField('maxPValue', value);
  const setMaxHalfLife = (value: number) => setField('maxHalfLife', value);
  const setMinVolume = (value: number) => setField('minVolume', value);

  useEffect(() => {
    onChange({ usdtOnly, ignoreUsdtUsdc, maxPValue, maxHalfLife, minVolume });
  }, [usdtOnly, ignoreUsdtUsdc, maxPValue, maxHalfLife, minVolume]);

  return (
    <div className="flex flex-row items-center justify-between">
      <div className="flex flex-row gap-2 items-center">
        <input
          type="checkbox"
          className="checkbox checkbox-primary"
          checked={usdtOnly}
          onChange={() => setUsdtOnly(!usdtOnly)}
          id="usdtOnly"
        />
        <label className="text-sm" htmlFor="usdtOnly">
          USDT only
        </label>
      </div>

      <div className="flex flex-row gap-2 items-center">
        <input
          type="checkbox"
          className="checkbox checkbox-primary"
          checked={ignoreUsdtUsdc}
          onChange={() => setIgnoreUsdtUsdc(!ignoreUsdtUsdc)}
          id="ignoreUsdtUsdc"
        />
        <label className="text-sm" htmlFor="ignoreUsdtUsdc">
          Ignore USDT/USDC
        </label>
      </div>

      <div className="flex flex-row gap-2 items-center">
        <input
          type="number"
          min="0"
          max="1"
          step="0.01"
          className="input input-sm input-primary w-24"
          id="maxPValue"
          value={maxPValue}
          onChange={(e) => setMaxPValue(Number(e.target.value))}
        />

        <label className="text-sm" htmlFor="maxPValue">
          Max P-value
        </label>
      </div>

      <div className="flex flex-row gap-2 items-center">
        <input
          type="number"
          min="0"
          step="1"
          className="input input-sm input-primary w-24"
          id="maxHalfLife"
          value={maxHalfLife}
          onChange={(e) => setMaxHalfLife(Number(e.target.value))}
        />

        <label className="text-sm" htmlFor="maxHalfLife">
          Max half-life
        </label>
      </div>

      <div className="flex flex-row gap-2 items-center">
        <input
          type="number"
          min="0"
          step="1"
          className="input input-sm input-primary w-48"
          id="minVolume"
          value={minVolume}
          onChange={(e) => setMinVolume(Number(e.target.value))}
        />

        <label className="text-sm" htmlFor="minVolume">
          Min volume
        </label>
      </div>
    </div>
  );
};
