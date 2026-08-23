import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initKeycloak } from './lib/keycloak';
import './index.css';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container!);

root.render(<p className="p-6 text-sm text-gray-500">Loading…</p>);

initKeycloak()
  .then(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error('Keycloak init failed:', error);
    root.render(
      <p className="p-6 text-sm text-red-600">
        Authentication failed. Please reload the page.
      </p>
    );
  });
