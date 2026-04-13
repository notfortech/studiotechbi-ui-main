import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  fetchData,
  generateModels,
  getConnections,
  getModels,
  normalizeModelsResponse,
  parseOrchestratorPayload,
  selectModel,
} from '../services/insightService';
import type { DataConnection, ModelOptionWithEmbed, OrchestratorResponse } from '../types';

const POLL_MS = 3000;
const POLL_MAX_MS = 5 * 60 * 1000;

export type InsightsLoaderKind = 'idle' | 'fetch' | 'models' | 'orchestrator' | 'poll';

function applyPayload(
  data: unknown,
  setModels: Dispatch<SetStateAction<ModelOptionWithEmbed[]>>,
  setReport: Dispatch<SetStateAction<OrchestratorResponse | null>>
): OrchestratorResponse {
  const orch = parseOrchestratorPayload(data);
  const list = normalizeModelsResponse(data);
  if (list.length) setModels(list);

  if (orch.reportId && orch.embedUrl) {
    setReport(orch);
    return orch;
  }

  for (const m of list) {
    if (m.reportId && m.embedUrl) {
      setReport({
        reportId: m.reportId,
        datasetId: m.datasetId,
        embedUrl: m.embedUrl,
        accessToken: m.accessToken,
      });
      return {
        reportId: m.reportId,
        datasetId: m.datasetId,
        embedUrl: m.embedUrl,
        accessToken: m.accessToken,
      };
    }
  }

  return orch;
}

export function useInsightsFlow(clientId: string | undefined) {
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [connectionId, setConnectionId] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string } | null>(null);
  const [dataFetched, setDataFetched] = useState(false);
  const [models, setModels] = useState<ModelOptionWithEmbed[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOptionWithEmbed | null>(null);
  const [report, setReport] = useState<OrchestratorResponse | null>(null);
  const [loaderKind, setLoaderKind] = useState<InsightsLoaderKind>('idle');
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedPollAt = useRef(0);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshConnections = useCallback(async () => {
    try {
      setError(null);
      const list = await getConnections();
      setConnections(list);
    } catch {
      setError('Failed to load connections.');
    }
  }, []);

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  useEffect(
    () => () => {
      stopPoll();
    },
    [stopPoll]
  );

  const pollOnce = useCallback(
    async (cid: string): Promise<boolean> => {
      const data = await getModels(cid);
      const orch = applyPayload(data, setModels, setReport);
      const done = !!(orch.reportId && orch.embedUrl);
      return done;
    },
    []
  );

  const startPoll = useCallback(
    (cid: string) => {
      stopPoll();
      startedPollAt.current = Date.now();
      setLoaderKind('poll');
      const run = async () => {
        if (Date.now() - startedPollAt.current > POLL_MAX_MS) {
          stopPoll();
          setLoaderKind('idle');
          setError('Timed out waiting for the report. Check the orchestrator or try again.');
          return;
        }
        try {
          const done = await pollOnce(cid);
          if (done) {
            stopPoll();
            setLoaderKind('idle');
          }
        } catch {
          /* keep polling */
        }
      };
      void run();
      pollRef.current = setInterval(() => void run(), POLL_MS);
    },
    [pollOnce, stopPoll]
  );

  const handleFetchData = async (path: string, name: string) => {
    if (!connectionId) return;
    setSelectedFile({ path, name });
    setDataFetched(false);
    setModels([]);
    setReport(null);
    setSelectedModel(null);
    setError(null);
    setLoaderKind('fetch');
    try {
      await fetchData(connectionId, path);
      setDataFetched(true);
    } catch {
      setError('Failed to fetch data. Check the connection and path.');
    } finally {
      setLoaderKind('idle');
    }
  };

  const handleGenerateModels = async () => {
    if (!clientId) {
      setError('Missing client context. Re-login or contact support.');
      return;
    }
    setError(null);
    setLoaderKind('models');
    try {
      const gen = await generateModels(clientId);
      applyPayload(gen, setModels, setReport);
      const latest = await getModels(clientId);
      applyPayload(latest, setModels, setReport);
    } catch {
      setError('Model generation failed.');
    } finally {
      setLoaderKind('idle');
    }
  };

  const handleSelectModel = async (model: ModelOptionWithEmbed) => {
    setSelectedModel(model);
    setError(null);
    setLoaderKind('orchestrator');
    try {
      const orch = await selectModel(model.id, model.templateId);
      if (orch.reportId && orch.embedUrl) {
        setReport(orch);
        setLoaderKind('idle');
        return;
      }
      if (orch.queued) {
        if (clientId) startPoll(clientId);
        else {
          setLoaderKind('idle');
          setError('Job queued, but client id is missing for status polling.');
        }
        return;
      }
      if (clientId) {
        const latest = await getModels(clientId);
        applyPayload(latest, setModels, setReport);
      }
      setLoaderKind('idle');
    } catch {
      setError('Could not start report creation.');
      setLoaderKind('idle');
    }
  };

  const loaderMessage =
    loaderKind === 'fetch'
      ? 'Fetching your data...'
      : loaderKind === 'models'
        ? 'Analyzing your data...'
        : loaderKind === 'orchestrator' || loaderKind === 'poll'
          ? 'Setting up your dashboard...'
          : '';

  return {
    connections,
    connectionId,
    setConnectionId,
    selectedFile,
    dataFetched,
    models,
    selectedModel,
    report,
    loaderKind,
    loaderMessage,
    error,
    setError,
    refreshConnections,
    handleFetchData,
    handleGenerateModels,
    handleSelectModel,
  };
}
