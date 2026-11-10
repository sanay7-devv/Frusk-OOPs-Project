import AppRoutes from './routes/AppRoutes';
import { useRealtime } from './realtime/useRealtime';

export default function App() {
  useRealtime(); // one STOMP client after login, polling fallback
  return <AppRoutes />;
}
