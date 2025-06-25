import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { PairReportListPage } from '../pages/PairReportListPage/PairReportListPage';
import { PairReportPage } from '../pages/PairReportPage/PairReportPage';
import { PairReportBacktestPage } from '../pages/PairReportBacktestPage/PairReportBacktestPage';
import { PairPage } from '../pages/PairPage/PairPage';
import { AssetPriceLevelsPage } from '../pages/AssetPriceLevelsPage/AssetPriceLevelsPage';
import { SystemPage } from '../pages/SystemPage/SystemPage';
import { Navigation } from './Navigation/Navigation';
import { AssetsProvider } from '../entities/assets';

export const App = () => {
  return (
    <Router>
      <AssetsProvider>
        <main className="flex flex-col h-screen">
          <Navigation />
          <div className="container mx-auto p-4 flex-1 flex flex-col">
            <Routes>
              <Route path="/pairReport" element={<PairReportListPage />} />
              <Route path="/pairReport/:id" element={<PairReportPage />} />
              <Route path="/pairReport/:id/backtest" element={<PairReportBacktestPage />} />
              <Route path="/pair" element={<PairPage />} />
              <Route path="/assetPriceLevels" element={<AssetPriceLevelsPage />} />
              <Route path="/system" element={<SystemPage />} />
              <Route path="/" element={<Navigate to="/pairReport" />} />
            </Routes>
          </div>
        </main>
      </AssetsProvider>
    </Router>
  );
};
