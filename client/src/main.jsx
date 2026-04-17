import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import store from './store';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #2d3d55', borderRadius: '10px', fontSize: '0.88rem' },
        success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
      }} />
      <App />
    </BrowserRouter>
  </Provider>
);
