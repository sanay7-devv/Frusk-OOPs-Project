import { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { tokenStore, requestRefresh } from '../api/client';
import { unreadCount } from '../api/notifications';
import type { AppNotification } from '../api/types';
import { apiErrorMessage } from '../utils/errors';
import { realtimeStore } from './realtimeStore';
import type { DashboardEvent } from '../api/dashboard';

/** One STOMP client after login. If the socket is down, poll unread-count every 10 s. */
export function useRealtime() {
  const { user, workspaces } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const backoffRef = useRef(2000);

  useEffect(() => {
    if (!user) {
      realtimeStore.reset();
      return;
    }
    const access = tokenStore.getAccess();
    if (!access) return;

    let active = true;
    realtimeStore.setStatus('connecting');

    const createClient = () => {
      const currentToken = tokenStore.getAccess();
      const client = new Client({
        brokerURL: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws',
        connectHeaders: { Authorization: `Bearer ${currentToken ?? ''}` },
        reconnectDelay: backoffRef.current,
        onConnect: () => {
          setConnected(true);
          realtimeStore.setStatus('connected');
          backoffRef.current = 2000; // Reset backoff on successful connect

          client.subscribe('/user/queue/notifications', (m) => {
            realtimeStore.touch();
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
            client.subscribe('/topic/dashboard', (m) => {
              // Two message shapes: an incident event, or {type:'COUNTERS'} (counters only).
              try {
                const body = JSON.parse(m.body) as DashboardEvent | { type: string };
                if (body && typeof body === 'object' && 'type' in body && body.type !== 'COUNTERS') {
                  realtimeStore.pushEvent(body as DashboardEvent);
                } else {
                  realtimeStore.touch();
                }
              } catch {
                realtimeStore.touch(); // unreadable payload: the refetch below still refreshes the screens
              }
              qc.invalidateQueries({ queryKey: ['dashboard'] });
              qc.invalidateQueries({ queryKey: ['admin-incidents-kpi'] });
              qc.invalidateQueries({ queryKey: ['admin-incidents-list'] });
              qc.invalidateQueries({ queryKey: ['admin-incidents-all'] });
              qc.invalidateQueries({ queryKey: ['admin-audit-logs-feed'] });
            });
          }
        },
        // Every (re)connect sends the newest access token, also after a silent refresh.
        beforeConnect: (c) => {
          c.connectHeaders = { Authorization: `Bearer ${tokenStore.getAccess() ?? ''}` };
        },
        onWebSocketClose: async (evt) => {
          setConnected(false);
          if (active) realtimeStore.setStatus('reconnecting');
          const c = clientRef.current;
          if (!active || !c) return;
          // Exponential backoff for the library's own reconnect: 2 s, 3 s, 4.5 s ... up to 30 s.
          backoffRef.current = Math.min(backoffRef.current * 1.5, 30000);
          c.reconnectDelay = backoffRef.current;
          // Close code 4001 = TOKEN_EXPIRED: refresh once, then reconnect right away with the new token.
          if (evt.code === 4001) {
            try {
              await requestRefresh();
              if (active) {
                backoffRef.current = 2000;
                c.reconnectDelay = 2000;
              }
            } catch (e) {
              toast(`Live updates stopped: ${apiErrorMessage(e)}`, 'warning');
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
      realtimeStore.setStatus('off');
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
