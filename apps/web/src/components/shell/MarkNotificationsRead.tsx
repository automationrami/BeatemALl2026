'use client';

import { useEffect } from 'react';

/** Marks everything read once the list has been shown (the next visit shows them as read). */
export function MarkNotificationsRead() {
  useEffect(() => {
    void fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }).catch(() => null);
  }, []);
  return null;
}
