import { useEffect, useRef, useState } from 'react';
import { getGenerationStatus, type BlueprintGenerationJobDto } from '../api/blueprintApi';

const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = 5 * 60 * 1000;

interface UseBlueprintGenerationResult {
  job: BlueprintGenerationJobDto | null;
  isPolling: boolean;
  timedOut: boolean;
}

export function useBlueprintGeneration(
  generationId: string | undefined
): UseBlueprintGenerationResult {
  const [job, setJob] = useState<BlueprintGenerationJobDto | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
    setIsPolling(false);
  };

  useEffect(() => {
    if (!generationId) return;

    setJob(null);
    setTimedOut(false);
    setIsPolling(true);

    const poll = async () => {
      try {
        const status = await getGenerationStatus(generationId);
        setJob(status);
        if (status.status === 'Completed' || status.status === 'Failed') {
          stop();
        }
      } catch {
        // keep polling on transient errors
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    timeoutRef.current = setTimeout(() => {
      stop();
      setTimedOut(true);
    }, TIMEOUT_MS);

    return stop;
  }, [generationId]);

  return { job, isPolling, timedOut };
}
