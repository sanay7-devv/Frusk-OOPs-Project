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
    if (!access) {
      return;
    }
    const client = new Client({
      brokerURL: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws',
      connectHeaders: { Authorization: `Bearer ${access ?? ''}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe('/user/queue/notifications', (m) => {
          try {
            const n: AppNotification = JSON.parse(m.body);
            if (n?.title) toast(n.title, 'info');
          } catch {
            // ignore non-json payload
          }
          qc.invalidateQueries({ queryKey: ['unread'] });
          qc.invalidateQueries({ queryKey: ['incidents'] });
          qc.invalidateQueries({ queryKey: ['employee-incidents-home'] });
          qc.invalidateQueries({ queryKey: ['my-incidents'] });
          qc.invalidateQueries({ queryKey: ['employee-incident'] });
          qc.invalidateQueries({ queryKey: ['tech-my-queue'] });
          qc.invalidateQueries({ queryKey: ['tech-my-workload'] });
          qc.invalidateQueries({ queryKey: ['lead-team-queue'] });
          qc.invalidateQueries({ queryKey: ['lead-escalated-incidents'] });
          qc.invalidateQueries({ queryKey: ['notifications'] });
        });
        if (workspaces.includes('admin')) {
          client.subscribe('/topic/dashboard', () => {
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            qc.invalidateQueries({ queryKey: ['admin-incidents-kpi'] });
            qc.invalidateQueries({ queryKey: ['admin-incidents-all'] });
            qc.invalidateQueries({ queryKey: ['admin-audit-logs-feed'] });
          });
        }
      },
      onWebSocketClose: () => setConnected(false),
    });
    client.activate();
    return () => { client.deactivate(); };
  }, [user]); // eslint-disable-line

  useQuery({
    queryKey: ['unread'],
    queryFn: unreadCount,
    enabled: !!user && !connected && !!tokenStore.getAccess(),
    refetchInterval: 10_000,
  });
}
