import * as R from 'remeda';

import { TAsset, TPriceLevels } from '../../../server/services/assetService/types';
import { getColorForStrength } from './colors';

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
  asset: TAsset;
  priceLevels: TPriceLevels;
};

export const PriceLevels = ({ asset, priceLevels }: PriceLevelsProps) => {
  const { precision } = asset;

  return (
    <div className="flex bg-base-200 rounded-lg mb-6">
      <div className="p-4 flex-1">
        <h3 className="text-lg font-semibold mb-4">Support Levels</h3>
        <div className="space-y-4">
          {R.sortBy(priceLevels.supportLevels, [R.prop('price'), 'desc']).map((level, index) => (
            <PriceLevelRow level={level} precision={precision} key={`support-${index}`} />
          ))}
        </div>
      </div>

      <div className="p-4 flex-1">
        <h3 className="text-lg font-semibold mb-4">Resistance Levels</h3>
        <div className="space-y-4">
          {R.sortBy(priceLevels.resistanceLevels, [R.prop('price'), 'asc']).map((level, index) => (
            <PriceLevelRow level={level} precision={precision} key={`resistance-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
};
