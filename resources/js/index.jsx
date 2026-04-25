import { createRoot } from 'react-dom/client';  // ← esto faltaba
import App from './App';
import { API_BASE_URL } from './services/api';
import { startOutboxSync } from './services/syncOutbox';

startOutboxSync({ baseUrl: API_BASE_URL, intervalMs: 15000 });

const root = createRoot(document.getElementById('app'));
root.render(<App />);