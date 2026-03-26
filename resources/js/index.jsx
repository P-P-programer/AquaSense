import { createRoot } from 'react-dom/client';  // ← esto faltaba
import App from './App';

const root = createRoot(document.getElementById('app'));
root.render(<App />);