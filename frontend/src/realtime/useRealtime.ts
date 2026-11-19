import { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { tokenStore, requestRefresh } from '../api/client';
import { unreadCount } from '../api/notifications';
import type { AppNotification } from '../api/types';

/** One STOMP client after login. If the socket is down, poll unread-count every 10 s. */
export function useRealtime() {
  const { user, workspaces } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const backoffRef = useRef(2000);

  useEffect(() => {
    if (!user) return;
    const access = tokenStore.getAccess();
    if (!access) return;

    let active = true;

    const createClient = () => {
      const currentToken = tokenStore.getAccess();
      const client = new Client({
        brokerURL: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws',
        connectHeaders: { Authorization: `Bearer ${currentToken ?? ''}` },
        reconnectDelay: backoffRef.current,
        onConnect: () => {
          setConnected(true);
          backoffRef.current = 2000; // Reset backoff on successful connect

          client.subscribe('/user/queue/notifications', (m) => {
            try {
              const n: AppNotification = JSON.parse(m.body);
              if (n?.title) {
                const message = n.incidentId ? `${n.title} (Incident #${n.incidentId})` : n.title;
                toast(message, 'info');
              }
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
        onWebSocketClose: async (evt) => {
          setConnected(false);
          // Exponential backoff
          backoffRef.current = Math.min(backoffRef.current * 1.5, 30000);

          // Handle 4001: TOKEN_EXPIRED -> refresh and reconnect
          if (evt.code === 4001 && active) {
            try {
              const authData = await requestRefresh();
              if (active && clientRef.current) {
                clientRef.current.connectHeaders = { Authorization: `Bearer ${authData.accessToken}` };
                clientRef.current.activate();
              }
            } catch {
              // Refresh failed, auth failure handler will handle logout
            }
          }
        },
      });

      clientRef.current = client;
      client.activate();
    };

    createClient();

    return () => {
      active = false;
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [user, workspaces]); // eslint-disable-line

  useQuery({
    queryKey: ['unread'],
    queryFn: unreadCount,
    enabled: !!user && !connected && !!tokenStore.getAccess(),
    refetchInterval: 10_000,
  });
}
