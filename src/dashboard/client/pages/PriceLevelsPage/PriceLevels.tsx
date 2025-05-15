import * as R from 'remeda';

import { getColorForStrength } from './colors';
import { TPriceLevels } from '../../../server/api/priceLevels/types';

type PriceLevelRowProps = {
  level: TPriceLevels['supportLevels'][number] | TPriceLevels['resistanceLevels'][number];
  precision: number;
};

const PriceLevelRow = ({ level, precision }: PriceLevelRowProps) => {
  return (
    <div className={`flex items-center space-x-2 p-3 rounded bg-base-300`}>
      <div
        className="w-4 h-4 rounded-full"
        style={{
          backgroundColor: getColorForStrength(level.strength),
        }}
      />
      <div className="text-sm">
        {level.price.toFixed(precision)} (Strength: {level.strength})
      </div>
    </div>
  );
};

type PriceLevelsProps = {
  assetData: TPriceLevels;
};

export const PriceLevels = ({ assetData }: PriceLevelsProps) => {
  const { precision } = assetData;

  return (
    <div className="flex bg-base-200 rounded-lg mb-6">
      <div className="p-4 flex-1">
        <h3 className="text-lg font-semibold mb-4">Support Levels</h3>
        <div className="space-y-4">
          {R.sortBy(assetData.supportLevels, [R.prop('price'), 'desc']).map((level, index) => (
            <PriceLevelRow level={level} precision={precision} key={`support-${index}`} />
          ))}
        </div>
      </div>

      <div className="p-4 flex-1">
        <h3 className="text-lg font-semibold mb-4">Resistance Levels</h3>
        <div className="space-y-4">
          {R.sortBy(assetData.resistanceLevels, [R.prop('price'), 'asc']).map((level, index) => (
            <PriceLevelRow level={level} precision={precision} key={`resistance-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
};
