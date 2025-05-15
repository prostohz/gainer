import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { PriceLevelsPage } from '../pages/PriceLevelsPage/PriceLevelsPage';
import { VolumeAnomaliesPage } from '../pages/VolumeAnomaliesPage/VolumeAnomaliesPage';
import { CorrelationAnalysisPage } from '../pages/CorrelationAnalysisPage/CorrelationAnalysisPage';
import { Navigation } from './Navigation/Navigation';
import { AssetsProvider } from '../entities/assets';

export const App = () => {
  return (
    <Router>
      <AssetsProvider>
        <Navigation />
        <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
          <Routes>
            <Route path="/priceLevels" element={<PriceLevelsPage />} />
            <Route path="/volumeAnomalies" element={<VolumeAnomaliesPage />} />
            <Route path="/correlationAnalysis" element={<CorrelationAnalysisPage />} />
            <Route path="/" element={<Navigate to="/priceLevels" />} />
          </Routes>
        </div>
      </AssetsProvider>
    </Router>
  );
};
