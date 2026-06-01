import { useEffect, useState } from 'react';
import { getLoadedCofheClient } from '../cofhe';

/** Reflects @cofhe/sdk connection (wallet + viem clients wired). */
export function useCofheReady() {
  const [ready, setReady] = useState(Boolean(getLoadedCofheClient()?.connected));

  useEffect(() => {
    const id = window.setInterval(() => {
      setReady(Boolean(getLoadedCofheClient()?.connected));
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  return ready;
}
