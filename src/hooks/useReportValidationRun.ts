import { useEffect, useRef, useState } from 'react';
import { getReportValidationRun, type ReportValidationRun } from '../api/reportValidationApi';

const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = 5 * 60 * 1000;

interface UseReportValidationRunResult {
  run: ReportValidationRun | null;
  isPolling: boolean;
  timedOut: boolean;
}

export function useReportValidationRun(runId: string | undefined): UseReportValidationRunResult {
  const [run, setRun] = useState<ReportValidationRun | null>(null);
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
    if (!runId) return;

    setRun(null);
    setTimedOut(false);
    setIsPolling(true);

    const poll = async () => {
      try {
        const status = await getReportValidationRun(runId);
        setRun(status);
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
  }, [runId]);

  return { run, isPolling, timedOut };
}
