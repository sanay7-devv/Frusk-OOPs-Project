import { api, tokenStore } from './client';
import type { AppNotification, Page } from './types';

export const listNotifications = (page = 0): Promise<Page<AppNotification>> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return Promise.resolve({
      items: [
        {
          id: 1,
          eventType: 'INCIDENT_CREATED',
          title: 'Welcome to I-ITSM',
          message: 'Offline bypass mode active. Pre-decided credentials authenticated successfully.',
          incidentId: null,
          channel: 'IN_APP',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      page: 0,
      size: 10,
      totalItems: 1,
      totalPages: 1,
    });
  }
  return api.get<Page<AppNotification>>('/notifications', { params: { page } }).then(r => r.data).catch(() => ({
    items: [],
    page: 0,
    size: 10,
    totalItems: 0,
    totalPages: 0,
  }));
};

export const unreadCount = (): Promise<number> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    const saved = localStorage.getItem('mock_unread_count');
    return Promise.resolve(saved !== null ? Number(saved) : 3);
  }
  return api.get<{ count: number }>('/notifications/unread-count').then(r => r.data.count).catch(() => 0);
};

export const markRead = (id: number) => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    const current = Number(localStorage.getItem('mock_unread_count') ?? 3);
    const updated = Math.max(0, current - 1);
    localStorage.setItem('mock_unread_count', String(updated));
    return Promise.resolve();
  }
  return api.post(`/notifications/${id}/read`);
};

export const markAllRead = () => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    localStorage.setItem('mock_unread_count', '0');
    return Promise.resolve();
  }
  return api.post('/notifications/read-all');
};
