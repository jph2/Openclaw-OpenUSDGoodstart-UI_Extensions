import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import ChannelManager from './pages/ChannelManager.jsx';
import Workbench from './pages/Workbench.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/channels" element={<ChannelManager />} />
        <Route path="/workbench" element={<Workbench />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
