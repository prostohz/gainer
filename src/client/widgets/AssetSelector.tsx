import { useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import * as R from 'remeda';

import { Asset } from '../../server/models/Asset';
import { useLSState } from '../shared/localStorage';
import { useAvailableHeight } from '../shared/dom';

type AssetSelectorProps = {
  assets: Asset[];
  selectedAssetSymbol: string | null;
  onAssetSelect: (symbol: string) => void;
  isLoading: boolean;
};

const FAVORITES_LS_KEY = 'favoriteAssets';
const SHOW_FAVORITES_LS_KEY = 'showFavoritesOnly';

export const AssetSelector = ({
  assets,
  selectedAssetSymbol,
  onAssetSelect,
  isLoading,
}: AssetSelectorProps) => {
  const [assetFilter, setAssetFilter] = useState('');
  const [favorites, setFavorites] = useLSState<string[]>(FAVORITES_LS_KEY, []);
  const [showOnlyFavorites, setShowOnlyFavorites] = useLSState<boolean>(
    SHOW_FAVORITES_LS_KEY,
    false,
  );

  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const containerHeight = useAvailableHeight(containerElement);

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

    const filtered = R.pipe(
      assets,
      R.filter((asset) => {
        if (showOnlyFavorites) {
          return favorites.includes(asset.symbol) || asset.symbol === selectedAssetSymbol;
        }

        return true;
      }),
      R.filter((asset) => {
        if (assetFilter) {
          return asset.symbol.toLowerCase().includes(assetFilter.toLowerCase());
        }

        return true;
      }),
      R.sortBy((asset) => (asset.symbol === selectedAssetSymbol ? 0 : 1)),
    );

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

  const renderAssetList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-full">
          <div className="text-center">
            <p className="text-sm text-neutral-content">Loading assets...</p>
          </div>
        </div>
      );
    }

    if (filteredAssets.length === 0) {
      return <div className="text-center text-md text-neutral-content py-4">No assets found</div>;
    }

    return (
      <List height={containerHeight} width="100%" itemCount={filteredAssets.length} itemSize={40}>
        {renderAssetItem}
      </List>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <input
          type="text"
          placeholder="Filter assets..."
          className="input input-bordered w-full"
          value={assetFilter}
          onChange={(e) => setAssetFilter(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox"
            checked={showOnlyFavorites}
            onChange={toggleShowOnlyFavorites}
          />
          <span className="text-sm">Show favorites only</span>
        </label>
      </div>
      <div className="overflow-y-auto h-full" ref={setContainerElement}>
        {renderAssetList()}
      </div>
    </div>
  );
};

export const setFavorites = (symbols: string[]) => {
  localStorage.setItem(FAVORITES_LS_KEY, JSON.stringify(symbols));
};
