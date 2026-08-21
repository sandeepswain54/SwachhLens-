import { useEffect, useState } from 'react';

/**
 * Ticks a countdown (in seconds) down to zero, once per second.
 * Call the setter with a positive number to start/restart the cooldown.
 */
export function useCooldown() {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return [cooldown, setCooldown] as const;
}
