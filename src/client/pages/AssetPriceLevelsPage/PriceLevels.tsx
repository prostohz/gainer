import * as R from 'remeda';

import { TPriceLevels, TPriceLevelItem } from '../../../shared/types';
import { Asset } from '../../../server/models/Asset';
import { getColorForStrength } from './colors';

type PriceLevelRowProps = {
  level: TPriceLevelItem;
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
  asset: Asset;
  priceLevels: TPriceLevels;
};

export const PriceLevels = ({ asset, priceLevels }: PriceLevelsProps) => {
  const { pricePrecision } = asset;

  return (
    <div className="flex bg-base-200 rounded-lg">
      <div className="p-4 flex-1">
        <h3 className="text-lg font-semibold mb-4">Support Levels</h3>
        <div className="space-y-4">
          {R.sortBy(priceLevels.supportLevels, [R.prop('price'), 'desc']).map((level, index) => (
            <PriceLevelRow level={level} precision={pricePrecision} key={`support-${index}`} />
          ))}
        </div>
      </div>

      <div className="p-4 flex-1">
        <h3 className="text-lg font-semibold mb-4">Resistance Levels</h3>
        <div className="space-y-4">
          {R.sortBy(priceLevels.resistanceLevels, [R.prop('price'), 'asc']).map((level, index) => (
            <PriceLevelRow level={level} precision={pricePrecision} key={`resistance-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
};
