import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HistoryPage from './pages/History';

// Global styles are loaded in main.jsx via index.css
// App.css is removed to prevent conflicts

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
