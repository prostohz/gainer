import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { PriceLevelsPage } from '../pages/PriceLevelsPage/PriceLevelsPage';
import { CorrelationPairPage } from '../pages/CorrelationPairPage/CorrelationPairPage';
import { CorrelationReportPage } from '../pages/CorrelationReportPage/CorrelationReportPage';
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
              <Route path="/priceLevels" element={<PriceLevelsPage />} />
              <Route path="/correlationPair" element={<CorrelationPairPage />} />
              <Route path="/correlationReport" element={<CorrelationReportPage />} />
              <Route path="/" element={<Navigate to="/priceLevels" />} />
            </Routes>
          </div>
        </main>
      </AssetsProvider>
    </Router>
  );
};
