import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Import Tailwind CSS
import { FirebaseProvider } from './firebase'; // Import the FirebaseProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <FirebaseProvider>
      <App />
    </FirebaseProvider>
  </React.StrictMode>
);
