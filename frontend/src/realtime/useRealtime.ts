import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { tokenStore } from '../api/client';
import { unreadCount } from '../api/notifications';
import type { AppNotification } from '../api/types';

/** One STOMP client after login. If the socket is down, poll unread-count every 10 s. */
export function useRealtime() {
  const { user, workspaces } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    const access = tokenStore.getAccess();
    if (!access || access.startsWith('mock-')) {
      // In offline mock mode or when token is not yet ready: skip WebSocket connection
      return;
    }
    const client = new Client({
      brokerURL: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws',
      connectHeaders: { Authorization: `Bearer ${access ?? ''}` },
      reconnectDelay: 5000, // TODO: exponential backoff
      onConnect: () => {
        setConnected(true);
        client.subscribe('/user/queue/notifications', (m) => {
          const n: AppNotification = JSON.parse(m.body);
          toast(n.title, 'info');
          qc.invalidateQueries({ queryKey: ['unread'] });
          qc.invalidateQueries({ queryKey: ['incidents'] });
        });
        if (workspaces.includes('admin'))
          client.subscribe('/topic/dashboard', () => qc.invalidateQueries({ queryKey: ['dashboard'] }));
      },
      onWebSocketClose: () => setConnected(false),
    });
    client.activate();
    return () => { client.deactivate(); };
  }, [user]); // eslint-disable-line

  useQuery({
    queryKey: ['unread'],
    queryFn: unreadCount,
    enabled: !!user && !connected && !!tokenStore.getAccess() && !tokenStore.getAccess()?.startsWith('mock-'),
    refetchInterval: 10_000,
  });
}
