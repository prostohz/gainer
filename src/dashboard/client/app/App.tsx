import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { CorrelationReportPage } from '../pages/CorrelationReportPage/CorrelationReportPage';
import { CorrelationClusterPage } from '../pages/CorrelationClusterPage/CorrelationClusterPage';
import { CorrelationPairPage } from '../pages/CorrelationPairPage/CorrelationPairPage';
import { AssetPriceLevelsPage } from '../pages/AssetPriceLevelsPage/AssetPriceLevelsPage';
import { Navigation } from './Navigation/Navigation';
import { AssetsProvider } from '../entities/assets';

export const App = () => {
  return (
    <Router>
      <AssetsProvider>
        <main className="flex flex-col h-screen">
          <Navigation />
          <div className="container mx-auto px-4 py-6 flex flex-col flex-grow">
            <Routes>
              <Route path="/correlationReport" element={<CorrelationReportPage />} />
              <Route path="/correlationCluster" element={<CorrelationClusterPage />} />
              <Route path="/correlationPair" element={<CorrelationPairPage />} />
              <Route path="/assetPriceLevels" element={<AssetPriceLevelsPage />} />
              <Route path="/" element={<Navigate to="/correlationPair" />} />
            </Routes>
          </div>
        </main>
      </AssetsProvider>
    </Router>
  );
};
