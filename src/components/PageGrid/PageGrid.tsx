/**
 * Page grid component with 1x4 layout for printing
 */

import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { RecordCard } from "../RecordCard/RecordCard";
import { PrintSidebar } from "../PrintSidebar/PrintSidebar";
import { useAppStore } from "../../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { useValidatePrintReadiness } from "../../utils/validationUtils";
import { handlePrint } from "../../utils/printUtils";
import { getPageDimensionsMm } from "../../utils/printLayout";
import { APP_EVENTS } from "../../constants";
import styles from "./PageGrid.module.css";
import { getFieldOverride } from "../../utils/textResize";
import type { DataRecord } from "../../types/dataRecord";
import Icon from "../Icon/Icon";

type ResizeBadge = {
  label: string;
  detail?: string;
  tone: "card" | "all" | "both";
};

export const PageGrid: React.FC = () => {
  const {
    records,
    svgTemplate,
    dataMapping,
    addError,
    textResizeRules,
    setTextResizeRules,
    printLayout,
    setPrintLayout,
  } = useAppStore(
    useShallow((state) => ({
      records: state.records,
      svgTemplate: state.svgTemplate,
      dataMapping: state.dataMapping,
      addError: state.addError,
      textResizeRules: state.textResizeRules,
      setTextResizeRules: state.setTextResizeRules,
      printLayout: state.printLayout,
      setPrintLayout: state.setPrintLayout,
    })),
  );
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedResizeCardIds, setSelectedResizeCardIds] = useState<string[]>(
    [],
  );
  const [fieldBaseSizes, setFieldBaseSizes] = useState<Record<string, number>>(
    {},
  );
  const sheetsPerPage = Math.max(1, printLayout.rows * printLayout.columns);
  const pageDimensions = getPageDimensionsMm(
    printLayout.pageSize,
    printLayout.orientation,
  );

  // Paginate records into groups (1x4 grid)
  const paginatedRecords = useMemo(() => {
    const pages: DataRecord[][] = [];
    for (let i = 0; i < records.length; i += sheetsPerPage) {
      pages.push(records.slice(i, i + sheetsPerPage));
    }
    return pages;
  }, [records, sheetsPerPage]);

  // Validate print readiness
  const printReadiness = useValidatePrintReadiness(
    svgTemplate,
    records,
    dataMapping,
  );

  const handlePrintClick = React.useCallback(async () => {
    try {
      if (!printReadiness.isReady) {
        printReadiness.errors.forEach((error) => addError(error));
        return;
      }

      await handlePrint({
        layout: printLayout,
        scrollContainer: printRef.current,
      });
    } catch (error) {
      addError(
        `Print failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }, [addError, printLayout, printReadiness]);

  useEffect(() => {
    const handlePrintRequest = () => {
      void handlePrintClick();
    };

    window.addEventListener(APP_EVENTS.PRINT_REQUEST, handlePrintRequest);
    return () =>
      window.removeEventListener(APP_EVENTS.PRINT_REQUEST, handlePrintRequest);
  }, [handlePrintClick]);

  useEffect(() => {
    if (!printRef.current) return;
    const container = printRef.current;

    const collectBaseSize = () => {
      const nextSizes: Record<string, number> = {};
      const elements = container.querySelectorAll(
        "[data-template-key], [data-template-keys]",
      );

      elements.forEach((node) => {
        const element = node as HTMLElement;
        const singleKey = element.getAttribute("data-template-key");
        const multiKeys = element.getAttribute("data-template-keys");
        const keys = singleKey
          ? [singleKey]
          : multiKeys
            ? multiKeys
                .split(",")
                .map((key) => key.trim())
                .filter(Boolean)
            : [];

        if (keys.length === 0) return;
        const fontSize = parseFloat(window.getComputedStyle(element).fontSize);
        if (Number.isNaN(fontSize) || fontSize <= 0) return;

        keys.forEach((key) => {
          if (!(key in nextSizes)) {
            nextSizes[key] = fontSize;
          }
        });
      });

      setFieldBaseSizes((prev) => {
        const prevEntries = Object.entries(prev);
        const nextEntries = Object.entries(nextSizes);

        if (prevEntries.length !== nextEntries.length) {
          return nextSizes;
        }

        for (const [key, value] of nextEntries) {
          if (prev[key] !== value) {
            return nextSizes;
          }
        }

        return prev;
      });
    };

    const handle = window.setTimeout(collectBaseSize, 100);
    return () => window.clearTimeout(handle);
  }, [records, svgTemplate, dataMapping]);

  const handleToggleResizeCard = useCallback((cardId: string) => {
    setSelectedResizeCardIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedResizeCardIds([]);
  }, []);

  const handleToggleSelectAllResizeCards = useCallback(() => {
    setSelectedResizeCardIds((prev) => {
      const nextIds = records.map((record) => record.id);
      if (nextIds.length === 0) return [];
      const previous = new Set(prev);
      const allSelected = nextIds.every((id) => previous.has(id));
      return allSelected ? [] : nextIds;
    });
  }, [records]);

  const selectedResizeCardIdSet = useMemo(
    () => new Set(selectedResizeCardIds),
    [selectedResizeCardIds],
  );
  const allResizeCardsSelected =
    records.length > 0 && selectedResizeCardIds.length === records.length;
  const selectedResizeCount = selectedResizeCardIds.length;

  const resizeBadgesByCardId = useMemo(() => {
    const badges: Record<string, ResizeBadge> = {};
    const allRules = textResizeRules.allCards || {};
    const allRuleKeys = Object.keys(allRules);

    records.forEach((record) => {
      const cardRules = textResizeRules.perCard[record.id] || {};
      const keys = new Set([...allRuleKeys, ...Object.keys(cardRules)]);
      let cardCount = 0;
      let allCount = 0;

      keys.forEach((key) => {
        const cardHas = Object.prototype.hasOwnProperty.call(cardRules, key);
        const allHas = Object.prototype.hasOwnProperty.call(allRules, key);
        if (!cardHas && !allHas) return;

        const { override, isExplicit } = getFieldOverride(
          textResizeRules,
          record.id,
          key,
        );
        if (!isExplicit) return;

        const isActive =
          override.unit === "px" || Math.abs(override.value - 100) > 0.001;
        if (!isActive) return;

        if (cardHas) {
          cardCount += 1;
        } else if (allHas) {
          allCount += 1;
        }
      });

      if (cardCount > 0 && allCount > 0) {
        badges[record.id] = {
          label: "Resized",
          detail: `Card ${cardCount} • All ${allCount}`,
          tone: "both",
        };
        return;
      }

      if (cardCount > 0) {
        badges[record.id] = {
          label: "Card Resize",
          detail: `${cardCount} field${cardCount > 1 ? "s" : ""}`,
          tone: "card",
        };
        return;
      }

      if (allCount > 0) {
        badges[record.id] = {
          label: "All Resize",
          detail: `${allCount} field${allCount > 1 ? "s" : ""}`,
          tone: "all",
        };
      }
    });

    return badges;
  }, [records, textResizeRules]);

  if (!printReadiness.isReady) {
    return (
      <div className={styles.pageGridContainer} data-print-scope="true">
        <h3>Print Preview</h3>
        <div className={styles.notReady}>
          <div className={styles.requirements}>
            <h4>Requirements for Printing:</h4>
            <ul>
              {!svgTemplate && <li>Upload SVG template</li>}
              {records.length === 0 && <li>Upload CSV data</li>}
              {Object.keys(dataMapping).length === 0 && (
                <li>Configure data mapping</li>
              )}
            </ul>
          </div>

          {printReadiness.errors.length > 0 && (
            <div className={styles.errors}>
              <h4>Issues to Resolve:</h4>
              <ul>
                {printReadiness.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageGridContainer} data-print-scope="true">
      <div className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Print studio</p>
          <h3>Print Preview</h3>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleToggleSelectAllResizeCards}
            disabled={records.length === 0}
          >
            <Icon name="checklist" size={18} />
            {allResizeCardsSelected ? "Deselect All Cards" : "Target All Cards"}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleClearSelection}
            disabled={selectedResizeCount === 0}
          >
            <Icon name="close" size={18} />
            Clear Targeting
          </button>
          <button onClick={handlePrintClick} className={styles.printButton}>
            <Icon name="print" size={20} />
            Print Pages
          </button>
        </div>
      </div>

      {printReadiness.warnings.length > 0 && (
        <div className={styles.warnings}>
          <h4>Warnings:</h4>
          <ul>
            {printReadiness.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.previewLayout} data-print-preview-layout="true">
        <div
          className={styles.preview}
          ref={printRef}
          data-print-preview="true"
        >
          {paginatedRecords.map((page, pageIndex) => (
            (() => {
              const pageStyle: React.CSSProperties & {
                "--print-page-ratio"?: number;
              } = {
                gridTemplateColumns: `repeat(${printLayout.columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${printLayout.rows}, minmax(0, 1fr))`,
                aspectRatio: `${pageDimensions.width} / ${pageDimensions.height}`,
                "--print-page-ratio": pageDimensions.width / pageDimensions.height,
              };

              return (
                <div
                  key={pageIndex}
                  className={`${styles.pageGrid} print`}
                  data-print-page="true"
                  data-print-page-break={
                    pageIndex < paginatedRecords.length - 1 ? "page" : "none"
                  }
                  style={pageStyle}
                >
                  {page.map((record, recordIndex) => {
                    const isSelected = selectedResizeCardIdSet.has(record.id);
                    const resizeBadge = resizeBadgesByCardId[record.id] ?? null;
                    return (
                      <div
                        key={record.id}
                        className={`${styles.recordCardContainer} print ${
                          isSelected ? styles.recordCardSelected : ""
                        }`}
                        data-print-card="true"
                        onClick={() => handleToggleResizeCard(record.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleToggleResizeCard(record.id);
                          }
                        }}
                      >
                        <RecordCard
                          record={record}
                          index={pageIndex * sheetsPerPage + recordIndex}
                          preview={true}
                        />
                        <div className={styles.selectionBadge}>
                          {isSelected ? "Selected" : "Select"}
                        </div>
                        {resizeBadge && (
                          <div
                            className={`${styles.resizeBadge} ${
                              styles[`resizeBadge${resizeBadge.tone}`]
                            }`}
                          >
                            <span className={styles.resizeBadgeTitle}>
                              {resizeBadge.label}
                            </span>
                            {resizeBadge.detail && (
                              <span className={styles.resizeBadgeDetail}>
                                {resizeBadge.detail}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {Array.from({
                    length: sheetsPerPage - page.length,
                  }).map((_, emptyIndex) => (
                    <div
                      key={`empty-${emptyIndex}`}
                      className={`${styles.emptySlot} print`}
                      data-print-empty="true"
                    />
                  ))}
                </div>
              );
            })()
          ))}
        </div>

        <PrintSidebar
          data={{ records, svgTemplate, fieldBaseSizes }}
          layout={{ value: printLayout, onChange: setPrintLayout }}
          resize={{
            rules: textResizeRules,
            onChangeRules: setTextResizeRules,
            selectedCardIds: selectedResizeCardIds,
            onToggleCard: handleToggleResizeCard,
            onClearSelection: handleClearSelection,
          }}
        />
      </div>
    </div>
  );
};
