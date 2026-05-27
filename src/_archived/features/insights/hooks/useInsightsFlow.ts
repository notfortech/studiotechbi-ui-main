import { useCallback, useEffect, useState } from 'react';
import {
  generateModels,
  getConnections,
  getModels,
  getReport,
  importData,
  listInsightModels,
  normalizeInsightModelsResponse,
  removeConnection,
  selectModel,
  suggestTransformationsFromBlob,
} from '../services/insightService';
import type {
  DataConnection,
  InsightModel,
  InsightReport,
  InsightsWithTemplatesResponse,
  VerifiedTemplateMatch,
} from '../types';

const POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 3000;

function isModelActive(status: string | undefined): boolean {
  return (status ?? '').toLowerCase() === 'active';
}

export type InsightsLoaderKind = 'idle' | 'fetch' | 'models' | 'orchestrator' | 'poll';

export function useInsightsFlow(clientId: string | undefined) {
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [connectionId, setConnectionId] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string } | null>(null);
  const [dataImported, setDataImported] = useState(false);
  const [suggestions, setSuggestions] = useState<InsightsWithTemplatesResponse | null>(null);
  const [models, setModels] = useState<InsightModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<InsightModel | null>(null);
  const [report, setReport] = useState<InsightReport | null>(null);
  const [loaderKind, setLoaderKind] = useState<InsightsLoaderKind>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (modelId: string) => {
    const data = await getReport(modelId);
    setReport(data);
  }, []);

  const pollUntilReady = useCallback(
    async (modelId: string) => {
      if (!clientId) {
        setError('Client id is required for status polling.');
        return;
      }
      for (let i = 0; i < POLL_ATTEMPTS; i++) {
        try {
          const list = await listInsightModels(clientId);
          setModels(list);
          const model = list.find((m) => m.id === modelId);
          if (model && isModelActive(model.status)) {
            try {
              await loadReport(modelId);
            } catch {
              setError('Could not load report embed.');
            }
            return;
          }
        } catch {
          /* continue polling */
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      setError('Report is still processing. Try again or refresh this page later.');
    },
    [clientId, loadReport]
  );

  const refreshConnections = useCallback(async () => {
    if (!clientId) {
      setConnections([]);
      return;
    }
    try {
      setError(null);
      // eslint-disable-next-line no-console
      console.log('[connections] fetch', { clientId });
      const list = await getConnections(clientId);
      // eslint-disable-next-line no-console
      console.log('[connections] response', { count: list.length, list });
      setConnections(list);
    } catch {
      setError('Failed to load connections.');
    }
  }, [clientId]);

  const handleRemoveConnection = useCallback(
    async (id: string) => {
      try {
        setError(null);
        // eslint-disable-next-line no-console
        console.log('[connections] remove', { id, clientId });
        await removeConnection(id);
        if (connectionId === id) setConnectionId('');
        await refreshConnections();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[connections] remove failed', e);
        setError('Failed to remove connection.');
      }
    },
    [clientId, connectionId, refreshConnections]
  );

  useEffect(() => {
    void refreshConnections();
  }, [refreshConnections]);

  const handleImportData = async (path: string, name: string) => {
    if (!connectionId) return;
    setSelectedFile({ path, name });
    setDataImported(false);
    setSuggestions(null);
    setModels([]);
    setReport(null);
    setSelectedModel(null);
    setError(null);
    setLoaderKind('fetch');
    try {
      await importData(connectionId, path);
      setDataImported(true);
    } catch {
      setError('Failed to load the sample. Check the dataset and table selection.');
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
      const withTemplates = await suggestTransformationsFromBlob({
        clientId,
        dataConnectionId: connectionId,
        path: selectedFile?.path,
      });
      setSuggestions(withTemplates);
    } catch {
      setError('Could not load data structure and verified template suggestions.');
      setLoaderKind('idle');
      return;
    }
    try {
      const gen = await generateModels(clientId);
      const fromGen = normalizeInsightModelsResponse(gen);
      if (fromGen.length) setModels(fromGen);
      const latest = await getModels(clientId);
      const fromLatest = normalizeInsightModelsResponse(latest);
      if (fromLatest.length) setModels(fromLatest);
    } catch {
      setError('Suggestions are shown, but model provisioning failed. You may need to run generate again.');
    } finally {
      setLoaderKind('idle');
    }
  };

  const handleSelectVerified = async (match: VerifiedTemplateMatch) => {
    const model = models.find((m) => m.templateId === match.template.templateId);
    if (!model) {
      setError('No model is ready for that template yet. Run generate suggestions again.');
      return;
    }
    await handleSelectModel(model);
  };

  const handleSelectModel = async (model: InsightModel) => {
    setSelectedModel(model);
    setReport(null);
    setError(null);
    setLoaderKind('orchestrator');
    try {
      const res = await selectModel(model.id, model.templateId);
      if (res.queued) {
        setLoaderKind('poll');
        await pollUntilReady(model.id);
      } else {
        await loadReport(model.id);
      }
      if (clientId) {
        try {
          const latest = await getModels(clientId);
          const list = normalizeInsightModelsResponse(latest);
          if (list.length) setModels(list);
        } catch {
          /* non-fatal */
        }
      }
    } catch {
      setError('Could not create or load the report.');
    } finally {
      setLoaderKind('idle');
    }
  };

  const loaderMessage =
    loaderKind === 'fetch'
      ? 'Loading sample from report storage...'
      : loaderKind === 'models'
        ? 'Generating template-verified suggestions...'
        : loaderKind === 'orchestrator' || loaderKind === 'poll'
          ? 'Building your report...'
          : '';

  return {
    connections,
    connectionId,
    setConnectionId,
    selectedFile,
    dataFetched: dataImported,
    suggestions,
    models,
    selectedModel,
    report,
    loaderKind,
    loaderMessage,
    error,
    setError,
    refreshConnections,
    handleRemoveConnection,
    handleFetchData: handleImportData,
    handleGenerateModels,
    handleSelectModel,
    handleSelectVerified,
  };
}
