import { useEffect, useState } from 'react';
import { cofheClient } from '../cofhe';

/** Reflects @cofhe/sdk connection (wallet + viem clients wired). */
export function useCofheReady() {
  const [ready, setReady] = useState(cofheClient.connected);

  useEffect(() => {
    const id = window.setInterval(() => {
      setReady(cofheClient.connected);
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  return ready;
}
