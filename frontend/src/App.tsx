import AppRoutes from './routes/AppRoutes';
import { useRealtime } from './realtime/useRealtime';
import StudioMotion from './components/StudioMotion';

export default function App() {
  useRealtime(); // one STOMP client after login, polling fallback
  return <><StudioMotion /><AppRoutes /></>;
}

