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
import {
  getRequiredPlaceholders,
  getUnmappedRequiredPlaceholders,
  isRequiredPlaceholder,
} from "../../utils/requiredFields";

import styles from "./DataMapping.module.css";
import Icon from "../Icon/Icon";
import { posthog } from "../../lib/posthog";

export const DataMapping: React.FC = () => {
  const {
    csvData,
    svgTemplate,
    dataMapping,
    setDataMapping,
    selectedRowIndices,
    isReadyForMapping,
    isReadyForPreview,
  } = useAppStore(
    useShallow((state) => ({
      csvData: state.csvData,
      svgTemplate: state.svgTemplate,
      dataMapping: state.dataMapping,
      setDataMapping: state.setDataMapping,
      selectedRowIndices: state.selectedRowIndices,
      isReadyForMapping: state.isReadyForMapping,
      isReadyForPreview: state.isReadyForPreview,
    })),
  );

  const [autoSuggestedMapping, setAutoSuggestedMapping] = useState(false);
  const [showOnlyUnresolved, setShowOnlyUnresolved] = useState(false);
  const [placeholderFilter, setPlaceholderFilter] = useState("");
  const [mobileActivePlaceholder, setMobileActivePlaceholder] = useState<
    string | null
  >(null);

  const validationResult = useValidateDataMapping(svgTemplate, csvData, dataMapping);

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
    if (!svgTemplate) {
      setDataMapping({});
      setAutoSuggestedMapping(false);
      return;
    }

    const emptyMapping = Object.fromEntries(
      svgTemplate.placeholders.map((placeholder) => [placeholder, ""]),
    );
    setDataMapping(emptyMapping);
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
  const previewRowNumber = selectedRowIndices.length > 0 ? selectedRowIndices[0] + 1 : null;

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
  const requiredPlaceholderCount = useMemo(
    () => (svgTemplate ? getRequiredPlaceholders(svgTemplate.placeholders).length : 0),
    [svgTemplate],
  );
  const unmappedRequiredPlaceholders = useMemo(
    () =>
      svgTemplate
        ? getUnmappedRequiredPlaceholders({
            placeholders: svgTemplate.placeholders,
            dataMapping,
          })
        : [],
    [dataMapping, svgTemplate],
  );
  const normalizedFilter = placeholderFilter.trim().toLowerCase();

  const placeholderRows = useMemo(() => {
    if (!svgTemplate) return [];

    return svgTemplate.placeholders.map((placeholder) => {
      const isUnmapped = unmappedPlaceholders.includes(placeholder);
      const isRequired = isRequiredPlaceholder(placeholder);
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
        isRequired,
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

  React.useEffect(() => {
    if (visibleRows.length === 0) {
      setMobileActivePlaceholder(null);
      return;
    }

    if (
      mobileActivePlaceholder &&
      visibleRows.some((row) => row.placeholder === mobileActivePlaceholder)
    ) {
      return;
    }

    const preferredPlaceholder =
      visibleRows.find((row) => row.rowHasIssue)?.placeholder ??
      visibleRows[0]?.placeholder ??
      null;
    setMobileActivePlaceholder(preferredPlaceholder);
  }, [mobileActivePlaceholder, visibleRows]);

  const mobileCurrentIndex = useMemo(() => {
    if (visibleRows.length === 0) return -1;
    if (!mobileActivePlaceholder) return 0;
    const index = visibleRows.findIndex(
      (row) => row.placeholder === mobileActivePlaceholder,
    );
    return index === -1 ? 0 : index;
  }, [mobileActivePlaceholder, visibleRows]);

  const mobileCurrentRow =
    mobileCurrentIndex >= 0 ? visibleRows[mobileCurrentIndex] : null;

  const nextUnresolvedIndex = useMemo(() => {
    if (visibleRows.length === 0) return -1;

    const afterCurrent = visibleRows.findIndex(
      (row, index) => index > mobileCurrentIndex && row.rowHasIssue,
    );
    if (afterCurrent !== -1) return afterCurrent;

    return visibleRows.findIndex(
      (row, index) => index < mobileCurrentIndex && row.rowHasIssue,
    );
  }, [mobileCurrentIndex, visibleRows]);

  const mobileIssueMessages = useMemo(() => {
    if (!mobileCurrentRow) return [];

    const messages: string[] = [];
    if (mobileCurrentRow.isUnmapped) {
      messages.push("No CSV column is selected yet.");
    }
    if (mobileCurrentRow.isInvalidColumn) {
      messages.push("The selected column is no longer available in the CSV.");
    }
    if (mobileCurrentRow.isDuplicateColumn) {
      messages.push("This CSV column is already assigned to another placeholder.");
    }
    return messages;
  }, [mobileCurrentRow]);

  const jumpToMobileIndex = (index: number) => {
    const target = visibleRows[index];
    if (!target) return;
    setMobileActivePlaceholder(target.placeholder);
  };

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
      <div className={styles.header}>
        <div className={styles.headerIntro}>
          <p className={styles.eyebrow}>Field mapping</p>
          <h3>Connect placeholders to CSV columns</h3>
          <p>
            Resolve each placeholder once, then the rest of the workflow can
            render and print from the mapped columns.
          </p>
        </div>
        <div className={styles.headerStats}>
          <span className={styles.headerStat}>
            {mappedCount}/{placeholderCount} mapped
          </span>
          <span
            className={`${styles.headerStat} ${
              unmappedRequiredPlaceholders.length > 0
                ? styles.headerStatWarning
                : ""
            }`}
          >
            {unmappedRequiredPlaceholders.length}/{requiredPlaceholderCount} required unresolved
          </span>
          <span className={styles.headerStat}>{mappingCoverage}% coverage</span>
          {previewRowNumber ? (
            <span className={styles.headerStat}>Preview row {previewRowNumber}</span>
          ) : null}
        </div>
      </div>

      <div className={styles.topBar}>
        <div className={styles.topBarStatus}>
          {unmappedRequiredPlaceholders.length > 0 ? (
            <p className={styles.topBarMessage}>
              Resolve the required placeholders before moving to preview.
            </p>
          ) : unmappedPlaceholders.length > 0 ? (
            <p className={styles.topBarMessage}>
              Required fields are mapped. Optional placeholders can stay blank.
            </p>
          ) : (
            <p className={styles.topBarMessage}>
              Mapping is complete and ready for row selection.
            </p>
          )}
          <div className={styles.coverageTrack} aria-hidden="true">
            <div
              className={styles.coverageFill}
              style={{ width: `${mappingCoverage}%` }}
            />
          </div>
        </div>
        <div className={styles.actions}>
          <button
            onClick={handleAutoSuggest}
            className={styles.suggestButton}
            disabled={autoSuggestedMapping}
          >
            Auto-suggest
          </button>
          <button onClick={handleResetToDefault} className={styles.resetButton}>
            Use defaults
          </button>
          <button onClick={handleClearMapping} className={styles.clearButton}>
            Clear all
          </button>
        </div>
      </div>

      {unmappedPlaceholders.length > 0 && (
        <div className={styles.unmappedBlock}>
          <span className={styles.unmappedTitle}>Unresolved placeholders</span>
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

      <div className={styles.mobileMappingFlow}>
        <div className={styles.mobileFlowHeader}>
          <div>
            <p className={styles.mobileFlowMeta}>
              {visibleRows.length === 0
                ? "No placeholders in the current filter"
                : `Placeholder ${mobileCurrentIndex + 1} of ${visibleRows.length}`}
            </p>
            <h4 className={styles.mobileFlowTitle}>
              {mobileCurrentRow
                ? `{{${mobileCurrentRow.placeholder}}}`
                : "No matching placeholders"}
            </h4>
            <p className={styles.mobileFlowText}>
              Map one placeholder at a time, then move to the next unresolved
              item.
            </p>
          </div>
          {mobileCurrentRow ? (
            <span
              className={`${styles.mobileStatusBadge} ${
                mobileCurrentRow.rowHasIssue
                  ? styles.mobileStatusBadgeWarning
                  : styles.mobileStatusBadgeSuccess
              }`}
            >
              {mobileCurrentRow.rowHasIssue ? "Needs attention" : "Mapped"}
            </span>
          ) : null}
        </div>

        {mobileCurrentRow ? (
          <>
            <div className={styles.mobileMappingCard}>
              <div className={styles.mobileFieldGroup}>
                <span className={styles.mobileFieldLabel}>
                  Template placeholder
                </span>
                <code className={styles.mobilePlaceholderCode}>
                  {`{{${mobileCurrentRow.placeholder}}}`}
                </code>
                {mobileCurrentRow.isRequired ? (
                  <span className={styles.mobileRequiredBadge}>Required</span>
                ) : null}
              </div>

              <div className={styles.mobileFieldGroup}>
                <span className={styles.mobileFieldLabel}>CSV column</span>
                <select
                  value={mobileCurrentRow.selectedColumn || ""}
                  onChange={(event) =>
                    handleMappingChange(
                      mobileCurrentRow.placeholder,
                      event.target.value,
                    )
                  }
                  className={`${styles.columnSelect} ${
                    mobileCurrentRow.isInvalidColumn ||
                    mobileCurrentRow.isDuplicateColumn
                      ? styles.warning
                      : ""
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

              <div className={styles.mobileFieldGroup}>
                <span className={styles.mobileFieldLabel}>
                  {previewRowNumber
                    ? `Preview row ${previewRowNumber}`
                    : "Preview sample"}
                </span>
                {mobileCurrentRow.selectedColumn &&
                previewRow?.[mobileCurrentRow.selectedColumn] ? (
                  <div className={styles.mobilePreviewValue}>
                    {previewRow[mobileCurrentRow.selectedColumn]}
                  </div>
                ) : (
                  <div className={styles.mobilePreviewEmpty}>
                    No preview data for the current selection.
                  </div>
                )}
              </div>

              {mobileIssueMessages.length > 0 && (
                <div className={styles.mobileIssueBlock}>
                  <span className={styles.mobileIssueTitle}>Needs fixing</span>
                  <div className={styles.mobileIssueList}>
                    {mobileIssueMessages.map((message) => (
                      <span key={message} className={styles.mobileIssueItem}>
                        {message}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.mobileNavRow}>
              <button
                type="button"
                className={styles.mobileNavButton}
                onClick={() => jumpToMobileIndex(mobileCurrentIndex - 1)}
                disabled={mobileCurrentIndex <= 0}
              >
                Previous
              </button>
              <button
                type="button"
                className={styles.mobileNavButton}
                onClick={() => jumpToMobileIndex(nextUnresolvedIndex)}
                disabled={nextUnresolvedIndex === -1}
              >
                Next unresolved
              </button>
              <button
                type="button"
                className={`${styles.mobileNavButton} ${styles.mobileNavButtonPrimary}`}
                onClick={() => jumpToMobileIndex(mobileCurrentIndex + 1)}
                disabled={mobileCurrentIndex >= visibleRows.length - 1}
              >
                Next
              </button>
            </div>

            <div className={styles.mobileJumpStrip}>
              <span className={styles.mobileJumpLabel}>Jump to</span>
              <div className={styles.mobileJumpList}>
                {visibleRows.map((row, index) => (
                  <button
                    key={row.placeholder}
                    type="button"
                    className={`${styles.mobileJumpButton} ${
                      index === mobileCurrentIndex
                        ? styles.mobileJumpButtonActive
                        : ""
                    } ${row.rowHasIssue ? styles.mobileJumpButtonWarning : ""}`}
                    onClick={() => jumpToMobileIndex(index)}
                  >
                    <span className={styles.mobileJumpIndex}>{index + 1}</span>
                    <span className={styles.mobileJumpText}>{row.placeholder}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyFilteredState}>
            No placeholders match this filter.
          </div>
        )}
      </div>

      <div className={styles.mappingGrid}>
        <div className={styles.gridHeader}>
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
              {row.isRequired ? (
                <span className={styles.requiredBadge}>Required</span>
              ) : null}
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
