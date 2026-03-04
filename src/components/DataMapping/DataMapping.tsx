/**
 * Data mapping component for connecting template placeholders to CSV columns
 */

import React, { useMemo, useState } from "react";
import { useAppStore } from "../../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { useValidateDataMapping } from "../../utils/validationUtils";
import { findBestMatches } from "../../utils/fuzzyMatcher";
import { buildDefaultMapping } from "../../utils/mappingDefaults";
import { VALIDATION } from "../../constants";

import styles from "./DataMapping.module.css";
import Icon from "../Icon/Icon";
import { posthog } from "../../lib/posthog";

export const DataMapping: React.FC = () => {
  const {
    csvData,
    svgTemplate,
    dataMapping,
    setDataMapping,
    setErrors,
    setWarnings,
    selectedRowIndices,
    isReadyForMapping,
    isReadyForPreview,
  } = useAppStore(
    useShallow((state) => ({
      csvData: state.csvData,
      svgTemplate: state.svgTemplate,
      dataMapping: state.dataMapping,
      setDataMapping: state.setDataMapping,
      setErrors: state.setErrors,
      setWarnings: state.setWarnings,
      selectedRowIndices: state.selectedRowIndices,
      isReadyForMapping: state.isReadyForMapping,
      isReadyForPreview: state.isReadyForPreview,
    })),
  );

  const [autoSuggestedMapping, setAutoSuggestedMapping] = useState(false);
  const [showOnlyUnresolved, setShowOnlyUnresolved] = useState(false);
  const [placeholderFilter, setPlaceholderFilter] = useState("");

  const validationResult = useValidateDataMapping(svgTemplate, csvData, dataMapping);

  React.useEffect(() => {
    if (!validationResult) {
      setErrors([]);
      setWarnings([]);
      return;
    }

    setErrors(validationResult.errors);
    setWarnings(validationResult.warnings);
  }, [validationResult, setErrors, setWarnings]);

  const handleMappingChange = (templateKey: string, csvColumn: string) => {
    const newMapping = { ...dataMapping, [templateKey]: csvColumn };
    setDataMapping(newMapping);
  };

  const getDefaultMapping = React.useCallback(() => {
    if (!csvData || !svgTemplate) return {};

    return buildDefaultMapping({
      headers: csvData.headers,
      placeholders: svgTemplate.placeholders,
    });
  }, [csvData, svgTemplate]);

  React.useEffect(() => {
    setAutoSuggestedMapping(false);
  }, [csvData, svgTemplate]);

  const prevReadyForPreview = React.useRef(false);
  React.useEffect(() => {
    const ready = isReadyForPreview();
    if (ready && !prevReadyForPreview.current && svgTemplate) {
      const total = svgTemplate.placeholders.length;
      const mapped = svgTemplate.placeholders.filter((k) => Boolean(dataMapping[k])).length;
      posthog.capture('data mapping completed', {
        placeholder_count: total,
        mapped_count: mapped,
        coverage_percent: total === 0 ? 100 : Math.round((mapped / total) * 100),
      });
    }
    prevReadyForPreview.current = ready;
  }, [isReadyForPreview, svgTemplate, dataMapping]);

  const handleAutoSuggest = () => {
    if (!csvData || !svgTemplate) return;

    const matches = findBestMatches(
      svgTemplate.placeholders,
      csvData.headers,
      VALIDATION.MAPPING_CONFIDENCE_THRESHOLD,
    );
    const autoMapping: Record<string, string> = {};

    matches.forEach(
      (match: { placeholder: string; column: string; confidence: number }) => {
        if (match.confidence > VALIDATION.MAPPING_CONFIDENCE_THRESHOLD) {
          autoMapping[match.placeholder] = match.column;
        }
      },
    );

    setDataMapping({ ...dataMapping, ...autoMapping });
    setAutoSuggestedMapping(true);
    posthog.capture('data mapping auto suggested', {
      placeholder_count: svgTemplate.placeholders.length,
      auto_mapped_count: Object.keys(autoMapping).length,
    });
  };

  const handleClearMapping = () => {
    setDataMapping({});
    setAutoSuggestedMapping(false);
  };

  const handleResetToDefault = () => {
    setDataMapping(getDefaultMapping());
    setAutoSuggestedMapping(false);
  };

  const previewRow = useMemo(() => {
    if (!csvData) return null;
    if (!selectedRowIndices || selectedRowIndices.length === 0) return null;
    const firstSelectedIndex = selectedRowIndices[0];
    return csvData.rows[firstSelectedIndex] || null;
  }, [csvData, selectedRowIndices]);

  const duplicateColumns = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(dataMapping).forEach((column) => {
      if (!column) return;
      counts.set(column, (counts.get(column) ?? 0) + 1);
    });

    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([column]) => column),
    );
  }, [dataMapping]);

  const placeholderCount = svgTemplate?.placeholders.length ?? 0;
  const mappedCount = svgTemplate
    ? svgTemplate.placeholders.filter((placeholder) => Boolean(dataMapping[placeholder]))
        .length
    : 0;
  const mappingCoverage =
    placeholderCount === 0
      ? 0
      : Math.round((mappedCount / placeholderCount) * 100);
  const unmappedPlaceholders = useMemo(
    () => validationResult?.unmappedPlaceholders ?? [],
    [validationResult?.unmappedPlaceholders],
  );
  const normalizedFilter = placeholderFilter.trim().toLowerCase();

  const placeholderRows = useMemo(() => {
    if (!svgTemplate) return [];

    return svgTemplate.placeholders.map((placeholder) => {
      const isUnmapped = unmappedPlaceholders.includes(placeholder);
      const selectedColumn = dataMapping[placeholder];
      const isInvalidColumn =
        !!selectedColumn && !csvData?.headers.includes(selectedColumn);
      const isDuplicateColumn =
        !!selectedColumn && duplicateColumns.has(selectedColumn);
      const rowHasIssue = Boolean(
        isUnmapped || isInvalidColumn || isDuplicateColumn,
      );

      return {
        placeholder,
        isUnmapped,
        selectedColumn,
        isInvalidColumn,
        isDuplicateColumn,
        rowHasIssue,
      };
    });
  }, [csvData?.headers, dataMapping, duplicateColumns, svgTemplate, unmappedPlaceholders]);

  const visibleRows = useMemo(
    () =>
      placeholderRows.filter((row) => {
        if (showOnlyUnresolved && !row.rowHasIssue) return false;
        if (normalizedFilter.length === 0) return true;
        return row.placeholder.toLowerCase().includes(normalizedFilter);
      }),
    [normalizedFilter, placeholderRows, showOnlyUnresolved],
  );

  if (!isReadyForMapping()) {
    return (
      <div className={styles.dataMapping}>
        <h3>Data Mapping</h3>
        <div className={styles.notReady}>
          <p>Please upload both a CSV file and SVG template to proceed with mapping.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dataMapping}>
      <h3>Map Template Placeholders to CSV Columns</h3>
      <p>
        Connect each template placeholder ({"{key}"}) to the corresponding CSV
        column so every rendered card has the correct values.
      </p>

      <div className={styles.mappingSummary}>
        <div className={styles.mappingMetric}>
          <span className={styles.mappingMetricLabel}>Placeholders</span>
          <strong>{placeholderCount}</strong>
        </div>
        <div className={styles.mappingMetric}>
          <span className={styles.mappingMetricLabel}>Mapped</span>
          <strong>{mappedCount}</strong>
        </div>
        <div className={styles.mappingMetric}>
          <span className={styles.mappingMetricLabel}>Coverage</span>
          <strong>{mappingCoverage}%</strong>
        </div>
      </div>

      <div className={styles.coverageBar}>
        <div className={styles.coverageFill} style={{ width: `${mappingCoverage}%` }} />
      </div>

      {unmappedPlaceholders.length > 0 && (
        <div className={styles.unmappedBlock}>
          <span className={styles.unmappedTitle}>Still missing</span>
          <div className={styles.unmappedList}>
            {unmappedPlaceholders.map((placeholder) => (
              <span key={placeholder} className={styles.unmappedTag}>
                {placeholder}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.filterToolbar}>
        <div className={styles.filterInputWrap}>
          <label htmlFor="placeholder-filter" className={styles.filterLabel}>
            Filter placeholders
          </label>
          <input
            id="placeholder-filter"
            type="text"
            value={placeholderFilter}
            onChange={(event) => setPlaceholderFilter(event.target.value)}
            className={styles.filterInput}
            placeholder="Search key name…"
          />
        </div>
        <button
          type="button"
          className={`${styles.filterToggle} ${
            showOnlyUnresolved ? styles.filterToggleActive : ""
          }`}
          onClick={() => setShowOnlyUnresolved((prev) => !prev)}
        >
          {showOnlyUnresolved ? "Showing unresolved" : "Show unresolved only"}
        </button>
        <span className={styles.filterCount}>
          {visibleRows.length} of {placeholderRows.length}
        </span>
      </div>

      <div className={styles.mappingGrid}>
        <div className={styles.headerRow}>
          <div className={styles.placeholderHeader}>Template Placeholder</div>
          <div className={styles.columnHeader}>CSV Column</div>
          <div className={styles.previewHeader}>Preview Data</div>
        </div>

        {visibleRows.map((row) => (
          <div
            key={row.placeholder}
            className={`${styles.mappingRow} ${
              row.rowHasIssue ? styles.mappingRowWarning : ""
            }`}
          >
            <div className={styles.placeholderCell}>
              <code className={styles.placeholderCode}>{`{{${row.placeholder}}}`}</code>
            </div>

            <div className={styles.columnCell}>
              <select
                value={row.selectedColumn || ""}
                onChange={(event) =>
                  handleMappingChange(row.placeholder, event.target.value)
                }
                className={`${styles.columnSelect} ${
                  row.isInvalidColumn || row.isDuplicateColumn ? styles.warning : ""
                }`}
              >
                <option value="">Select column</option>
                {csvData?.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.previewCell}>
              {row.selectedColumn && previewRow?.[row.selectedColumn] ? (
                <span className={styles.previewValue}>
                  {previewRow[row.selectedColumn]}
                </span>
              ) : (
                <span className={styles.noPreview}>No data</span>
              )}
            </div>
          </div>
        ))}
        {visibleRows.length === 0 && (
          <div className={styles.emptyFilteredState}>
            No placeholders match this filter.
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleAutoSuggest}
          className={styles.suggestButton}
          disabled={autoSuggestedMapping}
        >
          Auto-Suggest Mapping
        </button>

        <button onClick={handleResetToDefault} className={styles.resetButton}>
          Use Default Mapping
        </button>

        <button onClick={handleClearMapping} className={styles.clearButton}>
          Clear All
        </button>
      </div>

      {isReadyForPreview() && (
        <div className={styles.readyMessage}>
          <div className={styles.successIcon}>
            <Icon name="check" size={18} />
          </div>
          <p>Mapping complete. Continue to row selection and preview.</p>
        </div>
      )}
    </div>
  );
};
