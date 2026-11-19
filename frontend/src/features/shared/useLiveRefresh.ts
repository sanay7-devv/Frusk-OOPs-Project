import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Live updates through the app-wide STOMP client (`realtime/useRealtime`). That client invalidates
 * ['unread'] on every push to /user/queue/notifications; this hook runs `reload` each time it happens,
 * so a screen refreshes when the server pushes instead of waiting for its next poll.
 */
export function useLiveRefresh(reload: () => void, enabled = true) {
  const queryClient = useQueryClient();
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    if (!enabled) return undefined;
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'invalidate' && event.query.queryKey[0] === 'unread') {
        reloadRef.current();
      }
    });
  }, [queryClient, enabled]);
}
