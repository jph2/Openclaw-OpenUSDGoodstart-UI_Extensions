import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import { ChannelManagerPage } from './features/channel-manager';
import { WorkbenchPage } from './features/workbench';
import { DocumentationPage } from './features/documentation';

function App() {
  return (
    <BrowserRouter>
      {/* #root is flex + overflow:hidden — this shell passes flex + minHeight:0 so route pages can scroll internally */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%'
        }}
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/docs" element={<DocumentationPage />} />
          <Route path="/channels" element={<ChannelManagerPage />} />
          <Route path="/workbench" element={<WorkbenchPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
