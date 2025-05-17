import { useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';

import { TExchangeInfoSymbol } from '../../../trading/providers/Binance/BinanceHTTPClient';
import { useLSState } from '../shared/localStorage';

type AssetSelectorProps = {
  assets: TExchangeInfoSymbol[];
  selectedAssetSymbol: string | null;
  onAssetSelect: (symbol: string) => void;
};

export const AssetSelector = ({
  assets,
  selectedAssetSymbol,
  onAssetSelect,
}: AssetSelectorProps) => {
  const [assetFilter, setAssetFilter] = useState('');
  const [favorites, setFavorites] = useLSState<string[]>('favoriteAssets', []);
  const [showOnlyFavorites, setShowOnlyFavorites] = useLSState<boolean>('showFavoritesOnly', false);

  const toggleFavorite = (symbol: string) => {
    let newFavorites: string[];

    if (favorites.includes(symbol)) {
      newFavorites = favorites.filter((fav) => fav !== symbol);
    } else {
      newFavorites = [...favorites, symbol];
    }

    setFavorites(newFavorites);
  };

  const toggleShowOnlyFavorites = () => {
    setShowOnlyFavorites(!showOnlyFavorites);
  };

  const filteredAssets = useMemo(() => {
    if (!assets.length) return [];

    let filtered = assets;

    if (showOnlyFavorites) {
      filtered = filtered.filter(
        (asset) => favorites.includes(asset.symbol) || asset.symbol === selectedAssetSymbol,
      );
    }

    if (assetFilter) {
      const searchTerm = assetFilter.toLowerCase();
      filtered = filtered.filter((asset) => asset.symbol.toLowerCase().includes(searchTerm));
    }

    return filtered;
  }, [assets, assetFilter, favorites, showOnlyFavorites, selectedAssetSymbol]);

  const renderAssetItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const asset = filteredAssets[index];

    return (
      <div style={style} className="flex items-center gap-1 px-1">
        <button
          className={`btn btn-sm flex-grow ${
            asset.symbol === selectedAssetSymbol ? 'btn-primary' : 'btn-outline'
          }`}
          onClick={() => onAssetSelect(asset.symbol)}
        >
          {asset.symbol}
        </button>
        <button
          className={`btn btn-sm btn-square ${
            favorites.includes(asset.symbol) ? 'btn-warning' : 'btn-ghost'
          }`}
          onClick={() => toggleFavorite(asset.symbol)}
          title={favorites.includes(asset.symbol) ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill={favorites.includes(asset.symbol) ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      </div>
    );
  };

  if (!assets.length) return null;

  return (
    <div className="flex flex-col max-h-[500px]">
      <div className="mb-3">
        <input
          type="text"
          placeholder="Filter assets..."
          className="input input-bordered input-sm w-full"
          value={assetFilter}
          onChange={(e) => setAssetFilter(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={showOnlyFavorites}
            onChange={toggleShowOnlyFavorites}
          />
          <span className="text-sm">Show favorites only</span>
        </label>
      </div>
      <div className="overflow-y-auto max-h-[450px]">
        {filteredAssets.length > 0 ? (
          <List height={400} width="100%" itemCount={filteredAssets.length} itemSize={40}>
            {renderAssetItem}
          </List>
        ) : (
          <div className="text-center py-4 text-gray-500">No assets found</div>
        )}
      </div>
    </div>
  );
};
