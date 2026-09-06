import { createRoot } from 'react-dom/client';
import Home from './app/page';
import './app/globals.css';
// This build is a static Capacitor-compatible client. Configure a trusted HTTPS
// game backend before packaging; the server engine never ships in this bundle.
createRoot(document.getElementById('root')!).render(<Home />);
