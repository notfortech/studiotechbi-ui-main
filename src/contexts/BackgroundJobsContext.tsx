import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar, Alert, Button } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { getGenerationStatus as getBlueprintGenerationStatus } from '../api/blueprintApi';
import { getReportModelGenerationStatus } from '../api/reportDesignerApi';
import { ROUTES } from '../core/constants';

/**
 * Tracks long-running AI jobs (Blueprint generation, the Report Generator's AI-assisted "Data
 * Model" step) across page navigation, so a client can start one, move to another screen, and
 * come back later instead of being stuck watching a progress bar for several minutes. Both
 * backend flows are already async (submit -> generationId -> poll) — this provider is what keeps
 * polling alive regardless of which page is currently mounted, since it lives in ClientLayout
 * (outside the <Outlet/> that swaps per-route) rather than inside any one wizard page.
 *
 * Persisted to localStorage (namespaced per client) so a page reload or a closed tab doesn't lose
 * track of an in-flight job either — only logging out clears it, since the key changes with
 * clientCode.
 */

export type BackgroundJobType = 'blueprint' | 'reportModel';
export type BackgroundJobStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

export interface BackgroundJob {
  id: string;
  type: BackgroundJobType;
  label: string;
  status: BackgroundJobStatus;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  /** False once the job finishes until the user opens/acknowledges it via the notification bell
   * or the completion toast's "View" action — drives the bell's unread badge count. */
  seen: boolean;
  /** blueprintId, for navigating a completed blueprint job straight to its result. */
  resultRef?: string;
}

interface BackgroundJobsContextValue {
  jobs: BackgroundJob[];
  trackJob: (id: string, type: BackgroundJobType, label: string) => void;
  markSeen: (id: string) => void;
  dismissJob: (id: string) => void;
  /** Navigates to the right screen for this job's type — Blueprint page for a completed blueprint,
   * or the Report Generator wizard (resuming it) for a completed Data Model job. */
  navigateToJob: (job: BackgroundJob) => void;
  unseenCount: number;
}

const BackgroundJobsContext = createContext<BackgroundJobsContextValue | undefined>(undefined);

const POLL_INTERVAL_MS = 5000;
const MAX_JOBS = 20;

function storageKey(clientCode: string | undefined): string {
  return `stbi.backgroundJobs.${clientCode ?? 'unknown'}`;
}

function loadJobs(key: string): BackgroundJob[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as BackgroundJob[]) : [];
  } catch {
    return [];
  }
}

interface NormalizedStatus {
  status: BackgroundJobStatus;
  completedAt?: string;
  errorMessage?: string;
  blueprintId?: string;
}

async function fetchJobStatus(job: BackgroundJob): Promise<NormalizedStatus> {
  if (job.type === 'blueprint') {
    const dto = await getBlueprintGenerationStatus(job.id);
    return {
      status: dto.status,
      completedAt: dto.completedAt,
      errorMessage: dto.errorMessage,
      blueprintId: dto.blueprintId,
    };
  }
  const dto = await getReportModelGenerationStatus(job.id);
  return { status: dto.status, completedAt: dto.completedAt, errorMessage: dto.errorMessage };
}

export function BackgroundJobsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const key = storageKey(user?.clientCode);

  const [jobs, setJobs] = useState<BackgroundJob[]>(() => loadJobs(key));
  const [toastQueue, setToastQueue] = useState<BackgroundJob[]>([]);
  const [currentToast, setCurrentToast] = useState<BackgroundJob | null>(null);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  // Reload from storage if the logged-in client changes (rare — a fresh login within the same tab).
  useEffect(() => {
    setJobs(loadJobs(key));
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(jobs.slice(0, MAX_JOBS)));
    } catch {
      // best-effort only — losing tracked-job persistence isn't fatal, polling still works
      // for the remainder of this session either way.
    }
  }, [jobs, key]);

  const trackJob = useCallback((id: string, type: BackgroundJobType, label: string) => {
    setJobs((prev) => {
      if (prev.some((j) => j.id === id)) return prev;
      const next: BackgroundJob = {
        id,
        type,
        label,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        seen: true,
      };
      return [next, ...prev].slice(0, MAX_JOBS);
    });
  }, []);

  const markSeen = useCallback((id: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, seen: true } : j)));
  }, []);

  const dismissJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const inFlight = jobsRef.current.filter((j) => j.status === 'Pending' || j.status === 'Processing');
      if (inFlight.length === 0) return;

      const settled = await Promise.allSettled(
        inFlight.map(async (job) => ({ id: job.id, result: await fetchJobStatus(job) }))
      );
      if (cancelled) return;

      const statusById = new Map<string, NormalizedStatus>();
      for (const s of settled) {
        if (s.status === 'fulfilled') statusById.set(s.value.id, s.value.result);
      }
      if (statusById.size === 0) return;

      const justFinished: BackgroundJob[] = [];
      for (const job of inFlight) {
        const next = statusById.get(job.id);
        if (!next || next.status === job.status) continue;
        const isFinished = next.status === 'Completed' || next.status === 'Failed';
        if (isFinished) {
          justFinished.push({
            ...job,
            status: next.status,
            completedAt: next.completedAt,
            errorMessage: next.errorMessage,
            resultRef: next.blueprintId ?? job.resultRef,
            seen: false,
          });
        }
      }

      setJobs((prev) =>
        prev.map((j) => {
          const next = statusById.get(j.id);
          if (!next || next.status === j.status) return j;
          const wasFinished = j.status === 'Completed' || j.status === 'Failed';
          const isFinished = next.status === 'Completed' || next.status === 'Failed';
          return {
            ...j,
            status: next.status,
            completedAt: next.completedAt,
            errorMessage: next.errorMessage,
            resultRef: next.blueprintId ?? j.resultRef,
            seen: isFinished && !wasFinished ? false : j.seen,
          };
        })
      );

      if (justFinished.length > 0) {
        setToastQueue((q) => [...q, ...justFinished]);
      }
    };

    void poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      setCurrentToast(toastQueue[0]);
      setToastQueue((q) => q.slice(1));
    }
  }, [toastQueue, currentToast]);

  const navigateToJob = useCallback(
    (job: BackgroundJob) => {
      if (job.type === 'blueprint') {
        navigate(ROUTES.CLIENT.BLUEPRINT);
      } else {
        navigate(`${ROUTES.CLIENT.REPORT_GENERATOR}?resumeGenerationId=${job.id}`);
      }
    },
    [navigate]
  );

  const handleToastView = () => {
    if (!currentToast) return;
    markSeen(currentToast.id);
    navigateToJob(currentToast);
    setCurrentToast(null);
  };

  const unseenCount = jobs.filter(
    (j) => !j.seen && (j.status === 'Completed' || j.status === 'Failed')
  ).length;

  return (
    <BackgroundJobsContext.Provider
      value={{ jobs, trackJob, markSeen, dismissJob, navigateToJob, unseenCount }}
    >
      {children}
      <Snackbar
        open={currentToast !== null}
        autoHideDuration={8000}
        onClose={() => setCurrentToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {currentToast ? (
          <Alert
            severity={currentToast.status === 'Completed' ? 'success' : 'error'}
            onClose={() => setCurrentToast(null)}
            action={
              currentToast.status === 'Completed' ? (
                <Button color="inherit" size="small" onClick={handleToastView}>
                  View
                </Button>
              ) : undefined
            }
            sx={{ maxWidth: 420 }}
          >
            {currentToast.status === 'Completed'
              ? `"${currentToast.label}" is ready.`
              : `"${currentToast.label}" failed${currentToast.errorMessage ? ' — see details in Notifications.' : '.'}`}
          </Alert>
        ) : undefined}
      </Snackbar>
    </BackgroundJobsContext.Provider>
  );
}

export function useBackgroundJobs(): BackgroundJobsContextValue {
  const ctx = useContext(BackgroundJobsContext);
  if (!ctx) throw new Error('useBackgroundJobs must be used within a BackgroundJobsProvider');
  return ctx;
}
