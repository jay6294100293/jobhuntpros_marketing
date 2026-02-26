import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AssetUpload } from './components/AssetUpload';
import { ScriptGenerator } from './components/ScriptGenerator';
import { CreateContent } from './components/CreateContent';
import { Gallery } from './components/Gallery';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<AssetUpload />} />
          <Route path="/scripts" element={<ScriptGenerator />} />
          <Route path="/create" element={<CreateContent />} />
          <Route path="/gallery" element={<Gallery />} />
        </Routes>
      </Layout>
      <Toaster 
        position="top-right" 
        theme="dark"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#fafafa',
            border: '1px solid #27272a',
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
