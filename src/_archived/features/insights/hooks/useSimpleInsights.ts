import { useCallback, useEffect, useState } from 'react';
import {
  getAvailableReportsConfig,
  getAvailableReportsConfigForClient,
  type AvailableReportConfig,
} from '../../../services/reportService';
import {
  formatInsightsApiError,
  getReportBlobDataSample,
  resolveBlobForReportInsights,
  suggestModelsFromBlob,
} from '../services/insightService';
import type { BlobDataSample, ModelsSuggestFromBlobResponse } from '../types';

function isActiveReport(c: AvailableReportConfig | null | undefined): c is AvailableReportConfig {
  if (!c?.clientCode) return false;
  return !!(c.powerBIReportId || c.powerBIDatasetId || c.blobFolderPath);
}

async function resolveReportConfig(
  reportClientCode: string | undefined,
  explicitClientOnly: boolean,
  useSelectedClient: boolean
): Promise<AvailableReportConfig | null> {
  if (explicitClientOnly && !reportClientCode) {
    return null;
  }
  if (reportClientCode) {
    const one = await getAvailableReportsConfigForClient(reportClientCode, {
      useSelectedClient: useSelectedClient || undefined,
    });
    if (isActiveReport(one)) return one;
  }
  if (explicitClientOnly) {
    return null;
  }
  const all = await getAvailableReportsConfig();
  return (all.find((c) => isActiveReport(c)) ?? all[0]) ?? null;
}

/**
 * @param useSelectedClientForApis - When true, all insights-engine + report config calls add `useSelectedClient` (accountant or client in accounting-firm mode, with a selected client).
 */
export function useSimpleInsights(
  clientId: string | undefined,
  reportClientCode: string | undefined,
  explicitClientOnly: boolean = false,
  useSelectedClientForApis: boolean = false
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<AvailableReportConfig | null>(null);
  const [sample, setSample] = useState<BlobDataSample | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [resolvedBlob, setResolvedBlob] = useState<{ clientId: string; blobPath: string } | null>(null);
  const [modelSuggestions, setModelSuggestions] = useState<ModelsSuggestFromBlobResponse | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      setActiveReport(null);
      setSample(null);
      setModelSuggestions(null);
      return;
    }
    if (explicitClientOnly && !reportClientCode) {
      setLoading(false);
      setActiveReport(null);
      setSample(null);
      setModelSuggestions(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSampleError(null);
    setSuggestionsError(null);
    setResolvedBlob(null);
    setModelSuggestions(null);
    const us = useSelectedClientForApis;
    try {
      const config = await resolveReportConfig(reportClientCode, explicitClientOnly, us);
      if (!isActiveReport(config)) {
        setActiveReport(null);
        setSample(null);
        setModelSuggestions(null);
        setLoading(false);
        return;
      }
      setActiveReport(config);
      const code = config.clientCode;

      let resolved: Awaited<ReturnType<typeof resolveBlobForReportInsights>> | null = null;
      try {
        resolved = await resolveBlobForReportInsights({ clientCode: code, useSelectedClient: us });
        setResolvedBlob(resolved);
      } catch {
        setSuggestionsError(
          'Could not resolve the report blob. Template suggestions need GET resolve-blob; the data sample may still load below.'
        );
        setModelSuggestions(null);
      }

      const samplePromise = getReportBlobDataSample({ clientCode: code, maxRows: 100, useSelectedClient: us });
      const sampleRes = await Promise.allSettled([samplePromise]).then((r) => r[0]);
      if (sampleRes.status === 'fulfilled') {
        setSample(sampleRes.value as BlobDataSample);
      } else {
        setSample(null);
        setSampleError(formatInsightsApiError(sampleRes.reason));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Insights.');
      setActiveReport(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, reportClientCode, explicitClientOnly, useSelectedClientForApis]);

  const generateAiInsights = useCallback(async () => {
    if (!resolvedBlob) {
      setSuggestionsError('Blob resolution is missing; cannot generate AI insights yet.');
      return;
    }
    setSuggesting(true);
    setSuggestionsError(null);
    try {
      const res = await suggestModelsFromBlob({
        clientId: resolvedBlob.clientId,
        blobPath: resolvedBlob.blobPath,
        useSelectedClient: useSelectedClientForApis,
      });
      setModelSuggestions(res);
    } catch (e) {
      setModelSuggestions(null);
      setSuggestionsError(formatInsightsApiError(e));
    } finally {
      setSuggesting(false);
    }
  }, [resolvedBlob, useSelectedClientForApis]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    loading,
    error,
    hasActiveReport: activeReport != null,
    activeReport,
    sample,
    sampleError,
    resolvedBlob,
    modelSuggestions,
    suggestionsError,
    suggesting,
    generateAiInsights,
    refresh: load,
  };
}
