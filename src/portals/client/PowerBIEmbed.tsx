import { useEffect, useRef } from "react";

import {
models,
service,
factories,
Report,
BasicFilterBuilder,
} from "powerbi-client";

import { POWERBI_MONTH_FILTER_TARGET }
from "../../services/reportService";

export interface MonthFilter {
year: number;
month: number;
}

interface Props {
  embedUrl: string;
  accessToken: string;
  reportId: string;
  onLoaded?: (report: Report) => void;

  monthFilter?: MonthFilter | null;

  periodFolder?: string | null;

  /** Multiple period values (e.g. ["2026-01", "2026-02"]) for multi-select filter */
  periodValues?: string[] | null;

  filterTarget?: {
    table: string;
    column: string;
  };
}

export const PowerBIEmbed = ({
  embedUrl,
  accessToken,
  reportId,
  onLoaded,
  monthFilter = null,
  periodFolder = null,
  periodValues = null,
  filterTarget = POWERBI_MONTH_FILTER_TARGET,
}: Props) => {

const reportRef = useRef<HTMLDivElement>(null);
const reportInstanceRef = useRef<Report | null>(null);
const loadedRef = useRef(false);

const powerbiServiceRef = useRef(
new service.Service(
factories.hpmFactory,
factories.wpmpFactory,
factories.routerFactory
)
);

const applyFilter = async (report: Report) => {

try {

  if (monthFilter) {

    const value =
      new Date(
        monthFilter.year,
        monthFilter.month - 1,
        1
      )
        .toISOString()
        .slice(0, 7);

    const filter =
      new BasicFilterBuilder()
        .withColumnTarget(
          filterTarget.table,
          filterTarget.column
        )
        .in([value])
        .build();

    await report.updateFilters(
      models.FiltersOperations.ReplaceAll,
      [filter.toJSON()]
    );

    return;

  }

  if (periodFolder) {
    const filter =
      new BasicFilterBuilder()
        .withColumnTarget(
          filterTarget.table,
          filterTarget.column
        )
        .in([periodFolder])
        .build();

    await report.updateFilters(
      models.FiltersOperations.ReplaceAll,
      [filter.toJSON()]
    );

    return;
  }

  if (periodValues && periodValues.length > 0) {
    const filter =
      new BasicFilterBuilder()
        .withColumnTarget(
          filterTarget.table,
          filterTarget.column
        )
        .in(periodValues)
        .build();

    await report.updateFilters(
      models.FiltersOperations.ReplaceAll,
      [filter.toJSON()]
    );

    return;
  }

  await report.updateFilters(
    models.FiltersOperations.RemoveAll
  );

}

catch (err) {

  console.error(
    "Power BI filter update failed:",
    err
  );

}

};

useEffect(() => {
if (!reportRef.current) return;

loadedRef.current = false;

powerbiServiceRef.current.reset(reportRef.current);

const embedConfig = {

  type: "report",

  id: reportId,

  embedUrl,

  accessToken,

  tokenType: models.TokenType.Embed,

  settings: {

    panes: {

      filters: {
        visible: false,
      },

      pageNavigation: {
        visible: true,
      },

    },

  },

};

const report =
  powerbiServiceRef.current.embed(
    reportRef.current,
    embedConfig
  ) as Report;

reportInstanceRef.current = report;

report.on("rendered", () => {

  if (loadedRef.current) return;

  loadedRef.current = true;

  onLoaded?.(report);

  applyFilter(report);

});

}, [
embedUrl,
accessToken,
reportId,
]);

useEffect(() => {

if (
  !loadedRef.current ||
  !reportInstanceRef.current
)
  return;

applyFilter(
  reportInstanceRef.current
);

}, [
  monthFilter,
  periodFolder,
  periodValues,
]);

return (

<div
  ref={reportRef}
  style={{
    height: "600px",
    width: "100%",
  }}
/>

);

};
