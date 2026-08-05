import { useEffect, useRef, useState } from 'react';
import { getReportGenerationJobStatus, type ReportGenerationJobStatus } from '../api/reportGeneratorApi';

// Sized for realistic large-file processing time -- longer than useBlueprintGeneration's 5-minute
// budget, since this covers a file big enough to need the async path in the first place.
const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = 20 * 60 * 1000;

interface UseReportGenerationJobResult {
  job: ReportGenerationJobStatus | null;
  isPolling: boolean;
  timedOut: boolean;
}

/** Mirrors useBlueprintGeneration.ts's polling pattern. "Stop polling" here only means the
 * browser stops asking -- it never cancels the job server-side, which keeps running in the
 * background worker regardless of whether anyone is still watching. */
export function useReportGenerationJob(jobId: string | undefined): UseReportGenerationJobResult {
  const [job, setJob] = useState<ReportGenerationJobStatus | null>(null);
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
    if (!jobId) return;

    setJob(null);
    setTimedOut(false);
    setIsPolling(true);

    const poll = async () => {
      try {
        const status = await getReportGenerationJobStatus(jobId);
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
  }, [jobId]);

  return { job, isPolling, timedOut };
}
