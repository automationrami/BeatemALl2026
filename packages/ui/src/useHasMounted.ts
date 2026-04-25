'use client';

import { useEffect, useState } from 'react';

/**
 * Returns false on the server and during the first client paint, then true after mount.
 * Use to gate any content that depends on `localStorage` / persisted Zustand state, so the
 * server-render and first client paint match (no React hydration mismatch + no layout flicker).
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
