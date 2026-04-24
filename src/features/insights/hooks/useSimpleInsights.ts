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
  suggestTransformationsFromBlob,
} from '../services/insightService';
import type { BlobDataSample, InsightsWithTemplatesResponse } from '../types';

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
  const [suggestions, setSuggestions] = useState<InsightsWithTemplatesResponse | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      setActiveReport(null);
      setSample(null);
      setSuggestions(null);
      return;
    }
    if (explicitClientOnly && !reportClientCode) {
      setLoading(false);
      setActiveReport(null);
      setSample(null);
      setSuggestions(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSampleError(null);
    setSuggestionsError(null);
    const us = useSelectedClientForApis;
    try {
      const config = await resolveReportConfig(reportClientCode, explicitClientOnly, us);
      if (!isActiveReport(config)) {
        setActiveReport(null);
        setSample(null);
        setSuggestions(null);
        setLoading(false);
        return;
      }
      setActiveReport(config);
      const code = config.clientCode;

      let resolved: Awaited<ReturnType<typeof resolveBlobForReportInsights>> | null = null;
      try {
        resolved = await resolveBlobForReportInsights({ clientCode: code, useSelectedClient: us });
      } catch {
        setSuggestionsError(
          'Could not resolve the report blob. Template suggestions need GET resolve-blob; the data sample may still load below.'
        );
        setSuggestions(null);
      }

      const samplePromise = getReportBlobDataSample({ clientCode: code, maxRows: 100, useSelectedClient: us });
      const toRun: Promise<unknown>[] = [samplePromise];
      if (resolved) {
        toRun.push(
          suggestTransformationsFromBlob({
            clientId: resolved.clientId,
            path: resolved.blobPath,
            useSelectedClient: us,
          })
        );
      }
      const results = await Promise.allSettled(toRun);
      const sampleRes = results[0];
      if (sampleRes.status === 'fulfilled') {
        setSample(sampleRes.value as BlobDataSample);
      } else {
        setSample(null);
        setSampleError(formatInsightsApiError(sampleRes.reason));
      }
      if (resolved && results.length > 1) {
        const suggRes = results[1];
        if (suggRes.status === 'fulfilled') {
          setSuggestions(suggRes.value as InsightsWithTemplatesResponse);
        } else {
          setSuggestions(null);
          setSuggestionsError(formatInsightsApiError(suggRes.status === 'rejected' ? suggRes.reason : null));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Insights.');
      setActiveReport(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, reportClientCode, explicitClientOnly, useSelectedClientForApis]);

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
    suggestions,
    suggestionsError,
    refresh: load,
  };
}
