import { api } from './client';
import type { AppNotification, Page } from './types';

export interface NotificationFilters {
  unread?: boolean;
  channel?: string;
  page?: number;
  size?: number;
}

export interface PreferenceView {
  channel: string;
  eventType: string;
  enabled: boolean;
  locked: boolean;
}

export interface PreferenceRequest {
  channel: string;
  eventType: string;
  enabled: boolean;
}

export const listNotifications = async (filters: NotificationFilters = {}): Promise<Page<AppNotification>> => {
  const res = await api.get<Page<AppNotification>>('/notifications', { params: filters });
  return res.data;
};

export const unreadCount = async (): Promise<number> => {
  const res = await api.get<{ count: number }>('/notifications/unread-count');
  return res.data.count;
};

export const markRead = async (id: number): Promise<void> => {
  await api.post(`/notifications/${id}/read`);
};

export const markAllRead = async (): Promise<void> => {
  await api.post('/notifications/read-all');
};

export const getNotificationPreferences = async (): Promise<PreferenceView[]> => {
  const res = await api.get<PreferenceView[]>('/notifications/preferences');
  return res.data;
};

export const updateNotificationPreferences = async (preferences: PreferenceRequest[]): Promise<PreferenceView[]> => {
  const res = await api.put<PreferenceView[]>('/notifications/preferences', preferences);
  return res.data;
};
