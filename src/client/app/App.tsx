import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { MRReportListPage } from '../pages/MRReportListPage/MRReportListPage';
import { MRReportPage } from '../pages/MRReportPage/MRReportPage';
import { MRReportBacktestPage } from '../pages/MRReportBacktestPage/MRReportBacktestPage';
import { PairAnalysisPage } from '../pages/PairAnalysisPage/PairAnalysisPage';
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
              <Route path="/mrReport" element={<MRReportListPage />} />
              <Route path="/mrReport/:id" element={<MRReportPage />} />
              <Route path="/mrReport/:id/backtest" element={<MRReportBacktestPage />} />
              <Route path="/pairAnalysis" element={<PairAnalysisPage />} />
              <Route path="/assetPriceLevels" element={<AssetPriceLevelsPage />} />
              <Route path="/system" element={<SystemPage />} />
              <Route path="/" element={<Navigate to="/mrReport" />} />
            </Routes>
          </div>
        </main>
      </AssetsProvider>
    </Router>
  );
};
