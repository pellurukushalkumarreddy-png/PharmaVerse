import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './platform/Sidebar';
import HomePage from './platform/HomePage';
import TrialLens from './tools/triallens/TrialLens';
import DrugNexus from './tools/drugnexus/DrugNexus';
import BioInsight from './tools/bioinsight/BioInsight';
import FDAForge from './tools/fdaforge/FDAForge';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F9FC' }}>
      <Sidebar chatHistory={chatHistory} />
      <div style={{ marginLeft: 250, flex: 1 }}>
        <Routes>
          <Route path="/" element={
            <HomePage
              messages={messages} setMessages={setMessages}
              loading={loading} setLoading={setLoading}
              setChatHistory={setChatHistory}
            />
          } />
          <Route path="/triallens" element={<TrialLens />} />
          <Route path="/drugnexus" element={<DrugNexus />} />
          <Route path="/bioinsight" element={<BioInsight />} />
          <Route path="/fdaforge" element={<FDAForge />} />
        </Routes>
      </div>
    </div>
  );
}
