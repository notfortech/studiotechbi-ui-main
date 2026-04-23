import { useCallback, useMemo, useState } from 'react';
import type { ModelingRelationship, ModelingStep, PreviewTable, Selection, StepStatus } from '../types';

function cloneRows(rows: Record<string, string>[]): Record<string, string>[] {
  return rows.map((r) => ({ ...r }));
}

const initialSteps: ModelingStep[] = [
  {
    id: 'trim-spaces',
    group: 'transformations',
    name: 'Clean up text fields',
    status: 'pending',
    plainLanguageSummary: 'Extra spaces at the start and end of names are removed so matching works reliably.',
    recommendation: 'Approve — this is safe and improves quality.',
    rejectImpact: 'If you skip this, some rows may not match when we link to other tables.',
    previewBefore: {
      columns: ['customer_name', 'city'],
      rows: [
        { customer_name: '  ACME Corp  ', city: ' Sydney ' },
        { customer_name: 'Beta LLC', city: 'Melbourne' },
      ],
    },
    previewAfter: {
      columns: ['customer_name', 'city'],
      rows: [
        { customer_name: 'ACME Corp', city: 'Sydney' },
        { customer_name: 'Beta LLC', city: 'Melbourne' },
      ],
    },
    affectedColumns: ['customer_name', 'city'],
  },
  {
    id: 'standardize-dates',
    group: 'transformations',
    name: 'Standardize dates',
    status: 'pending',
    plainLanguageSummary: 'All order dates are shown in one consistent format.',
    recommendation: 'Approve — charts and filters will behave correctly.',
    rejectImpact: 'Dates may look inconsistent in reports and sorts may be wrong.',
    previewBefore: {
      columns: ['order_id', 'order_date'],
      rows: [
        { order_id: '1001', order_date: '03/01/2026' },
        { order_id: '1002', order_date: '2026-01-15' },
      ],
    },
    previewAfter: {
      columns: ['order_id', 'order_date'],
      rows: [
        { order_id: '1001', order_date: '2026-03-01' },
        { order_id: '1002', order_date: '2026-01-15' },
      ],
    },
    affectedColumns: ['order_date'],
  },
  {
    id: 'rename-columns',
    group: 'mappings',
    name: 'Friendly column names',
    status: 'pending',
    plainLanguageSummary: 'Technical codes are renamed to names everyone on the team understands.',
    recommendation: 'Approve — easier to read in reports.',
    rejectImpact: 'Reports may show cryptic field names.',
    previewBefore: {
      columns: ['cust_id', 'rev_amt'],
      rows: [
        { cust_id: 'C-01', rev_amt: '1200' },
        { cust_id: 'C-02', rev_amt: '980' },
      ],
    },
    previewAfter: {
      columns: ['customer_id', 'revenue'],
      rows: [
        { customer_id: 'C-01', revenue: '1200' },
        { customer_id: 'C-02', revenue: '980' },
      ],
    },
    affectedColumns: ['cust_id', 'rev_amt', 'customer_id', 'revenue'],
  },
];

const initialRelationships: ModelingRelationship[] = [
  {
    id: 'rel-orders-customers',
    from: 'orders.customer_id',
    to: 'customers.id',
    matchRate: 0.98,
    status: 'pending',
    plainLanguageSummary: 'Orders are linked to customers using the customer id.',
    recommendation: 'Approve — 98% of rows line up; a few may need a quick look later.',
    rejectImpact: 'Without this link, revenue by customer and similar views will not work.',
  },
];

export function useModelingStudio() {
  const [steps, setSteps] = useState<ModelingStep[]>(initialSteps);
  const [relationships, setRelationships] = useState<ModelingRelationship[]>(initialRelationships);
  const [selection, setSelection] = useState<Selection>({ kind: 'step', id: initialSteps[0].id });
  const [previewBefore, setPreviewBefore] = useState<PreviewTable>(() => ({
    columns: [...initialSteps[0].previewBefore.columns],
    rows: cloneRows(initialSteps[0].previewBefore.rows),
  }));
  const [previewAfter, setPreviewAfter] = useState<PreviewTable>(() => ({
    columns: [...initialSteps[0].previewAfter.columns],
    rows: cloneRows(initialSteps[0].previewAfter.rows),
  }));
  const [highlightColumns, setHighlightColumns] = useState<string[]>(() => [
    ...initialSteps[0].affectedColumns,
  ]);
  const [persisting, setPersisting] = useState(false);

  const selectedStep = useMemo(
    () => (selection?.kind === 'step' ? steps.find((s) => s.id === selection.id) ?? null : null),
    [selection, steps]
  );

  const selectedRelationship = useMemo(
    () =>
      selection?.kind === 'relationship'
        ? relationships.find((r) => r.id === selection.id) ?? null
        : null,
    [selection, relationships]
  );

  const applyPreviewForStep = useCallback((step: ModelingStep) => {
    setPreviewBefore({
      columns: [...step.previewBefore.columns],
      rows: cloneRows(step.previewBefore.rows),
    });
    setPreviewAfter({
      columns: [...step.previewAfter.columns],
      rows: cloneRows(step.previewAfter.rows),
    });
    setHighlightColumns([...step.affectedColumns]);
  }, []);

  const selectStep = useCallback(
    (id: string) => {
      setSelection({ kind: 'step', id });
      const step = steps.find((s) => s.id === id);
      if (step) applyPreviewForStep(step);
    },
    [applyPreviewForStep, steps]
  );

  const selectRelationship = useCallback((id: string) => {
    setSelection({ kind: 'relationship', id });
    setHighlightColumns([]);
    setPreviewBefore({ columns: ['from', 'to', 'sample'], rows: [] });
    setPreviewAfter({ columns: ['from', 'to', 'sample'], rows: [] });
  }, []);

  const setRelationshipStatus = useCallback((id: string, status: StepStatus) => {
    setRelationships((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);

  const approveStep = useCallback(
    (id: string) => {
      setSteps((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, status: 'approved' as StepStatus } : s));
        const st = next.find((s) => s.id === id);
        if (st) applyPreviewForStep(st);
        return next;
      });
    },
    [applyPreviewForStep]
  );

  const rejectStep = useCallback((id: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'rejected' as StepStatus } : s)));
  }, []);

  const approveRelationship = useCallback(
    (id: string) => {
      setRelationshipStatus(id, 'approved');
    },
    [setRelationshipStatus]
  );

  const rejectRelationship = useCallback(
    (id: string) => {
      setRelationshipStatus(id, 'rejected');
    },
    [setRelationshipStatus]
  );

  const updatePreview = useCallback(() => {
    if (selectedStep) applyPreviewForStep(selectedStep);
  }, [applyPreviewForStep, selectedStep]);

  const persistToBackend = useCallback(async () => {
    setPersisting(true);
    try {
      // eslint-disable-next-line no-console
      console.log('[data-studio] persist', { steps, relationships });
      await new Promise((r) => setTimeout(r, 600));
    } finally {
      setPersisting(false);
    }
  }, [relationships, steps]);

  const generateReport = useCallback(async () => {
    await persistToBackend();
    // eslint-disable-next-line no-console
    console.log('[data-studio] generateReport');
  }, [persistToBackend]);

  return {
    steps,
    relationships,
    selection,
    selectedStep,
    selectedRelationship,
    previewBefore,
    previewAfter,
    highlightColumns,
    persisting,
    selectStep,
    selectRelationship,
    approveStep,
    rejectStep,
    approveRelationship,
    rejectRelationship,
    updatePreview,
    persistToBackend,
    generateReport,
  };
}
