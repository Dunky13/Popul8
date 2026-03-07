import React, { useEffect, useState, useRef } from "react";
import type {
  PrintLayout,
  PrintOrientation,
  PrintPageSize,
} from "../../types/printLayout";
import type { DataRecord } from "../../types/dataRecord";
import type { SVGTemplate } from "../../types/template";
import type { TextResizeRules, TextResizeUnit } from "../../types/textResize";
import { getFieldOverride } from "../../utils/textResize";
import {
  extractPlaceholdersFromString,
  parseFirstNumberToken,
} from "../../utils/regexUtils";
import { removeDraftField, removeFieldResizeRules } from "./resizeHelpers";
import styles from "./PrintSidebar.module.css";
import { posthog } from "../../lib/posthog";

const PAGE_SIZE_OPTIONS: { value: PrintPageSize; label: string }[] = [
  { value: "A4", label: "A4" },
  { value: "A5", label: "A5" },
  { value: "A3", label: "A3" },
  { value: "Letter", label: "Letter" },
  { value: "Legal", label: "Legal" },
];

const ORIENTATION_OPTIONS: { value: PrintOrientation; label: string }[] = [
  { value: "landscape", label: "Landscape" },
  { value: "portrait", label: "Portrait" },
];

type LayoutPreset = {
  id: string;
  label: string;
  detail: string;
  rows: number;
  columns: number;
  orientation?: PrintOrientation;
};

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "single-focus",
    label: "Single",
    detail: "1×1 hero card",
    rows: 1,
    columns: 1,
    orientation: "portrait",
  },
  {
    id: "wide-strip",
    label: "Wide",
    detail: "1×4 strip",
    rows: 1,
    columns: 4,
    orientation: "landscape",
  },
  {
    id: "quad",
    label: "Quad",
    detail: "2×2 page",
    rows: 2,
    columns: 2,
  },
  {
    id: "dense",
    label: "Dense",
    detail: "3×3 sheet",
    rows: 3,
    columns: 3,
  },
];

const clampLayoutCount = (value: number, fallback: number) => {
  if (Number.isNaN(value)) return fallback;
  return Math.max(1, Math.min(10, Math.floor(value)));
};

const GRID_CELL_SIZE = 18;
const GRID_MAX_LIMIT = 10;
const MARGIN_MIN_MM = 0;
const MARGIN_MAX_MM = 30;
const MARGIN_STEP_MM = 0.5;

interface PrintSidebarProps {
  className?: string;
  data: {
    records: DataRecord[];
    svgTemplate: SVGTemplate | null;
    fieldBaseSizes: Record<string, number>;
  };
  layout: {
    value: PrintLayout;
    onChange: (layout: PrintLayout) => void;
  };
  resize: {
    rules: TextResizeRules;
    onChangeRules: (rules: TextResizeRules) => void;
    selectedCardIds: string[];
    onToggleCard: (cardId: string) => void;
    onClearSelection: () => void;
  };
}

interface ResizeFieldListProps {
  data: {
    placeholders: string[];
    templateContent?: string | null;
    fieldBaseSizes: Record<string, number>;
  };
  resize: {
    rules: TextResizeRules;
    onChangeRules: (rules: TextResizeRules) => void;
    selectedCardIds: string[];
  };
}

const ResizeFieldList: React.FC<ResizeFieldListProps> = ({ data, resize }) => {
  const { placeholders, templateContent, fieldBaseSizes } = data;
  const {
    rules: textResizeRules,
    onChangeRules: setTextResizeRules,
    selectedCardIds: selectedResizeCardIds,
  } = resize;
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const debounceTimersRef = useRef<Record<string, number>>({});
  const sortedPlaceholders = React.useMemo(() => {
    if (placeholders.length === 0) return placeholders;
    const parser = new DOMParser();
    const doc = parser.parseFromString(templateContent ?? "", "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return placeholders;

    const getElementRect = (element: Element) => {
      const xAttr = element.getAttribute("x");
      const yAttr = element.getAttribute("y");
      const widthAttr = element.getAttribute("width");
      const heightAttr = element.getAttribute("height");

      const x = parseFirstNumberToken(xAttr);
      const y = parseFirstNumberToken(yAttr);
      const width = widthAttr ? parseFirstNumberToken(widthAttr) : 0;
      const height = heightAttr ? parseFirstNumberToken(heightAttr) : 0;

      if ([x, y].some((value) => Number.isNaN(value))) return null;

      return { x, y, width, height };
    };

    const findRect = (element: Element) => {
      let current: Element | null = element;
      while (current) {
        const rect = getElementRect(current);
        if (rect) return rect;
        current = current.parentElement;
      }
      return null;
    };

    const placeholderPositions = new Map<string, { x: number; y: number }>();
    const elements = Array.from(
      svg.querySelectorAll("foreignObject, image, text"),
    );
    const positionEpsilon = 0.5;

    elements.forEach((element) => {
      const matches = new Set<string>();
      extractPlaceholdersFromString(element.textContent ?? "").forEach((name) =>
        matches.add(name),
      );
      const href =
        element.getAttribute("href") ??
        element.getAttribute("xlink:href") ??
        "";
      extractPlaceholdersFromString(href).forEach((name) => matches.add(name));
      if (matches.size === 0) return;

      const rect = findRect(element);
      if (!rect) return;

      matches.forEach((name) => {
        const current = placeholderPositions.get(name);
        if (!current) {
          placeholderPositions.set(name, { x: rect.x, y: rect.y });
          return;
        }
        const yDiff = rect.y - current.y;
        if (Math.abs(yDiff) > positionEpsilon) {
          if (yDiff < 0)
            placeholderPositions.set(name, { x: rect.x, y: rect.y });
          return;
        }
        const xDiff = rect.x - current.x;
        if (xDiff < -positionEpsilon) {
          placeholderPositions.set(name, { x: rect.x, y: rect.y });
        }
      });
    });

    const fallbackIndex = new Map(
      placeholders.map((name, index) => [name, index]),
    );

    return [...placeholders].sort((a, b) => {
      const aPos = placeholderPositions.get(a);
      const bPos = placeholderPositions.get(b);
      if (aPos && bPos) {
        const yDiff = aPos.y - bPos.y;
        if (Math.abs(yDiff) > positionEpsilon) return yDiff;
        const xDiff = aPos.x - bPos.x;
        if (Math.abs(xDiff) > positionEpsilon) return xDiff;
        return a.localeCompare(b);
      }
      if (aPos) return -1;
      if (bPos) return 1;
      return (fallbackIndex.get(a) ?? 0) - (fallbackIndex.get(b) ?? 0);
    });
  }, [placeholders, templateContent]);

  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach((timer) =>
        window.clearTimeout(timer),
      );
      debounceTimersRef.current = {};
    };
  }, []);

  const clearFieldDebounceTimer = (field: string) => {
    const timer = debounceTimersRef.current[field];
    if (!timer) return;
    window.clearTimeout(timer);
    delete debounceTimersRef.current[field];
  };

  const getDisplayValue = (
    field: string,
  ): { value: number | null; unit: TextResizeUnit; isMixed: boolean } => {
    const baseSize = fieldBaseSizes[field];
    const defaultUnit: TextResizeUnit = baseSize ? "px" : "percent";

    if (selectedResizeCardIds.length === 0) {
      const { override, isExplicit } = getFieldOverride(
        textResizeRules,
        "__all__",
        field,
      );
      if (!isExplicit) {
        return { value: null, unit: defaultUnit, isMixed: false };
      }
      return { value: override.value, unit: override.unit, isMixed: false };
    }

    const overrides = selectedResizeCardIds.map((cardId) =>
      getFieldOverride(textResizeRules, cardId, field),
    );
    const explicitOverrides = overrides.filter((entry) => entry.isExplicit);

    if (explicitOverrides.length === 0) {
      return { value: null, unit: defaultUnit, isMixed: false };
    }

    const first = explicitOverrides[0].override;
    const matches = explicitOverrides.every(
      (entry) =>
        entry.override.unit === first.unit &&
        Math.abs(entry.override.value - first.value) < 0.001,
    );

    if (!matches || explicitOverrides.length !== overrides.length) {
      return { value: null, unit: defaultUnit, isMixed: true };
    }

    return { value: first.value, unit: first.unit, isMixed: false };
  };

  const applyResizeValue = (
    field: string,
    value: string,
    unit: TextResizeUnit,
  ) => {
    if (value.trim() === "") return;
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    const clamped =
      unit === "px"
        ? Math.min(96, Math.max(0.1, numeric))
        : Math.min(150, Math.max(50, numeric));

    const nextRules = {
      allCards: { ...textResizeRules.allCards },
      perCard: { ...textResizeRules.perCard },
    };
    const override = { value: clamped, unit };

    if (selectedResizeCardIds.length === 0) {
      nextRules.allCards[field] = override;
    } else {
      selectedResizeCardIds.forEach((cardId) => {
        const current = nextRules.perCard[cardId]
          ? { ...nextRules.perCard[cardId] }
          : {};
        current[field] = override;
        nextRules.perCard[cardId] = current;
      });
    }

    setTextResizeRules(nextRules);
  };

  const handleResizeChange = (
    field: string,
    value: string,
    unit: TextResizeUnit,
  ) => {
    setDraftValues((prev) => ({ ...prev, [field]: value }));
    clearFieldDebounceTimer(field);
    debounceTimersRef.current[field] = window.setTimeout(() => {
      applyResizeValue(field, value, unit);
      delete debounceTimersRef.current[field];
    }, 350);
  };

  const handleResizeBlur = (field: string, unit: TextResizeUnit) => {
    const value = draftValues[field];
    clearFieldDebounceTimer(field);
    if (value !== undefined) {
      applyResizeValue(field, value, unit);
      setDraftValues((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleResizeClear = (field: string) => {
    clearFieldDebounceTimer(field);
    setDraftValues((prev) => removeDraftField(prev, field));
    setTextResizeRules(
      removeFieldResizeRules({
        rules: textResizeRules,
        selectedCardIds: selectedResizeCardIds,
        field,
      }),
    );
  };

  return (
    <div className={styles.resizeSection}>
      <div className={styles.resizeSectionTitle}>Field Sizes</div>
      <div className={styles.resizeFieldList}>
        {sortedPlaceholders.map((placeholder) => {
          const displayValue = getDisplayValue(placeholder);
          const draftValue = draftValues[placeholder];
          const baseSize = fieldBaseSizes[placeholder];
          return (
            <div key={placeholder} className={styles.resizeFieldRow}>
              <span className={styles.resizeFieldLabel}>{placeholder}</span>
              <div className={styles.resizeInputWrapper}>
                <input
                  type="number"
                  min={displayValue.unit === "px" ? 0.1 : 50}
                  max={displayValue.unit === "px" ? 96 : 150}
                  step={displayValue.unit === "px" ? 0.1 : 1}
                  value={draftValue ?? displayValue.value ?? ""}
                  placeholder={
                    displayValue.isMixed
                      ? "Mixed"
                      : displayValue.value === null && baseSize
                        ? `${baseSize.toFixed(1)}`
                        : displayValue.value === null
                          ? "100"
                          : ""
                  }
                  onChange={(event) =>
                    handleResizeChange(
                      placeholder,
                      event.target.value,
                      displayValue.unit,
                    )
                  }
                  onBlur={() =>
                    handleResizeBlur(placeholder, displayValue.unit)
                  }
                  className={styles.resizeInput}
                />
                <span className={styles.resizeInputSuffix}>
                  {displayValue.unit === "px" ? "px" : "%"}
                </span>
                <button
                  type="button"
                  className={styles.resizeResetButton}
                  onClick={() => handleResizeClear(placeholder)}
                >
                  Reset
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PrintSidebar: React.FC<PrintSidebarProps> = ({
  className,
  data,
  layout,
  resize,
}) => {
  const { records, svgTemplate, fieldBaseSizes } = data;
  const { value: printLayout, onChange: setPrintLayout } = layout;
  const {
    rules: textResizeRules,
    onChangeRules: setTextResizeRules,
    selectedCardIds: selectedResizeCardIds,
    onToggleCard: onToggleResizeCard,
    onClearSelection: onClearResizeSelection,
  } = resize;
  const [gridHover, setGridHover] = useState<{
    rows: number;
    columns: number;
  } | null>(null);
  const [gridMax, setGridMax] = useState<{ rows: number; columns: number }>({
    rows: printLayout.rows + 1,
    columns: printLayout.columns + 1,
  });
  const [isPageSetupCollapsed, setIsPageSetupCollapsed] = useState(true);
  const [showFieldSizeControls, setShowFieldSizeControls] = useState(false);
  const gridCollapseTimeoutRef = useRef<number | null>(null);

  const gridBaseRows = gridHover?.rows ?? printLayout.rows;
  const gridBaseCols = gridHover?.columns ?? printLayout.columns;
  const nextMaxRows = Math.min(
    GRID_MAX_LIMIT,
    Math.max(gridBaseRows + 1, printLayout.rows),
  );
  const nextMaxCols = Math.min(
    GRID_MAX_LIMIT,
    Math.max(gridBaseCols + 1, printLayout.columns),
  );
  const gridMaxRows = Math.min(
    GRID_MAX_LIMIT,
    Math.max(gridMax.rows, nextMaxRows),
  );
  const gridMaxCols = Math.min(
    GRID_MAX_LIMIT,
    Math.max(gridMax.columns, nextMaxCols),
  );

  const clearGridCollapseTimeout = () => {
    if (gridCollapseTimeoutRef.current !== null) {
      window.clearTimeout(gridCollapseTimeoutRef.current);
      gridCollapseTimeoutRef.current = null;
    }
  };

  const scheduleGridCollapse = () => {
    clearGridCollapseTimeout();
    gridCollapseTimeoutRef.current = window.setTimeout(() => {
      setGridMax({
        rows: Math.min(GRID_MAX_LIMIT, printLayout.rows + 1),
        columns: Math.min(GRID_MAX_LIMIT, printLayout.columns + 1),
      });
      gridCollapseTimeoutRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => clearGridCollapseTimeout();
  }, []);

  const cardsPerSheet = Math.max(1, printLayout.rows * printLayout.columns);
  const estimatedSheetCount =
    records.length === 0 ? 0 : Math.ceil(records.length / cardsPerSheet);
  const pageSetupSummary = `${printLayout.pageSize} ${
    printLayout.orientation === "landscape" ? "L" : "P"
  } ${printLayout.rows}x${printLayout.columns}`;

  const updateGridBounds = (rows: number, columns: number) => {
    setGridHover(null);
    setGridMax({
      rows: Math.min(GRID_MAX_LIMIT, rows + 1),
      columns: Math.min(GRID_MAX_LIMIT, columns + 1),
    });
  };

  const handlePageSizeChange = (value: PrintPageSize) => {
    setPrintLayout({ ...printLayout, pageSize: value });
  };

  const handleOrientationChange = (value: PrintOrientation) => {
    setPrintLayout({ ...printLayout, orientation: value });
  };

  const handleMarginChange = (value: string) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    const clamped = Math.min(MARGIN_MAX_MM, Math.max(MARGIN_MIN_MM, numeric));
    setPrintLayout({ ...printLayout, marginMm: clamped });
  };

  const handleGridSelect = (rows: number, columns: number) => {
    clearGridCollapseTimeout();
    const nextRows = clampLayoutCount(rows, printLayout.rows);
    const nextCols = clampLayoutCount(columns, printLayout.columns);
    const nextLayout = { ...printLayout, rows: nextRows, columns: nextCols };
    setPrintLayout(nextLayout);
    updateGridBounds(nextRows, nextCols);
    posthog.capture("print layout configured", {
      page_size: nextLayout.pageSize,
      orientation: nextLayout.orientation,
      rows: nextRows,
      columns: nextCols,
      source: "grid",
    });
  };

  const handlePresetSelect = (preset: LayoutPreset) => {
    clearGridCollapseTimeout();
    const nextRows = clampLayoutCount(preset.rows, printLayout.rows);
    const nextCols = clampLayoutCount(preset.columns, printLayout.columns);
    const nextOrientation = preset.orientation ?? printLayout.orientation;
    const nextLayout = {
      ...printLayout,
      rows: nextRows,
      columns: nextCols,
      orientation: nextOrientation,
    };
    setPrintLayout(nextLayout);
    updateGridBounds(nextRows, nextCols);
    posthog.capture("print layout configured", {
      page_size: nextLayout.pageSize,
      orientation: nextOrientation,
      rows: nextRows,
      columns: nextCols,
      source: "preset",
      preset_id: preset.id,
    });
  };

  const isPresetActive = (preset: LayoutPreset) => {
    if (
      printLayout.rows !== preset.rows ||
      printLayout.columns !== preset.columns
    ) {
      return false;
    }
    if (!preset.orientation) return true;
    return printLayout.orientation === preset.orientation;
  };

  const getRecordLabel = (record: DataRecord, index: number) => {
    const nameKey = Object.keys(record).find((key) =>
      key.toLowerCase().includes("name"),
    );
    const nameValue = nameKey ? String(record[nameKey] ?? "").trim() : "";
    if (nameValue) return `${index + 1}. ${nameValue}`;
    return `${index + 1}. ${record.id}`;
  };

  const handleGridHover = (rows: number, columns: number) => {
    clearGridCollapseTimeout();
    setGridHover({ rows, columns });
    setGridMax((prev) => ({
      rows: Math.min(
        GRID_MAX_LIMIT,
        Math.max(prev.rows, rows + 1, printLayout.rows + 1),
      ),
      columns: Math.min(
        GRID_MAX_LIMIT,
        Math.max(prev.columns, columns + 1, printLayout.columns + 1),
      ),
    }));
  };

  return (
    <aside className={`${styles.sidebar} ${className ?? ""}`.trim()}>
      <div className={styles.sectionCard}>
        <button
          type="button"
          className={styles.sectionToggle}
          onClick={() => setIsPageSetupCollapsed((value) => !value)}
          aria-expanded={!isPageSetupCollapsed}
        >
          <span className={styles.sectionToggleLead}>
            <span className={styles.sectionToggleCaret} aria-hidden="true">
              {isPageSetupCollapsed ? "▸" : "▾"}
            </span>
          </span>
          <span className={styles.sectionToggleMain}>
            <span className={styles.sectionToggleTitle}>Page setup</span>
            <span className={styles.sectionToggleSummary}>
              {pageSetupSummary}
            </span>
          </span>
          <span className={styles.sectionToggleIndicator}>
            {isPageSetupCollapsed ? "Edit" : "Collapse"}
          </span>
        </button>
        {!isPageSetupCollapsed && (
          <div className={styles.sectionBody}>
            <p className={styles.sectionIntro}>
              Set the sheet size, orientation, margin, and card grid.
            </p>
            <div className={styles.layoutControls}>
              <div className={styles.controlGroup}>
                <label
                  className={styles.controlLabel}
                  htmlFor="page-size-select"
                >
                  Page size
                </label>
                <select
                  id="page-size-select"
                  className={styles.controlSelect}
                  value={printLayout.pageSize}
                  onChange={(event) =>
                    handlePageSizeChange(event.target.value as PrintPageSize)
                  }
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.controlGroup}>
                <label
                  className={styles.controlLabel}
                  htmlFor="page-orientation-select"
                >
                  Orientation
                </label>
                <select
                  id="page-orientation-select"
                  className={styles.controlSelect}
                  value={printLayout.orientation}
                  onChange={(event) =>
                    handleOrientationChange(
                      event.target.value as PrintOrientation,
                    )
                  }
                >
                  {ORIENTATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.controlGroup}>
                <label
                  className={styles.controlLabel}
                  htmlFor="page-margin-input"
                >
                  Margin (mm)
                </label>
                <input
                  id="page-margin-input"
                  type="number"
                  min={MARGIN_MIN_MM}
                  max={MARGIN_MAX_MM}
                  step={MARGIN_STEP_MM}
                  value={printLayout.marginMm}
                  onChange={(event) => handleMarginChange(event.target.value)}
                  className={styles.controlInput}
                />
                <div className={styles.layoutHint}>
                  Adjusts printable area for the page.
                </div>
              </div>
              <div className={styles.controlGroup}>
                <div className={styles.controlLabel}>Layout</div>
                <div className={styles.layoutValue}>
                  {gridHover
                    ? `${gridHover.rows} × ${gridHover.columns}`
                    : `${printLayout.rows} × ${printLayout.columns}`}
                </div>
                <div
                  id="grid-picker"
                  className={styles.gridPicker}
                  role="grid"
                  aria-label="Choose rows and columns"
                  onMouseEnter={() => clearGridCollapseTimeout()}
                  onMouseLeave={() => {
                    setGridHover(null);
                    scheduleGridCollapse();
                  }}
                  style={{ gridTemplateRows: `repeat(${gridMaxRows}, 1fr)` }}
                >
                  {Array.from({ length: gridMaxRows }).map((_, rowIndex) => {
                    const row = rowIndex + 1;
                    return (
                      <div
                        key={`row-${row}`}
                        className={styles.gridRow}
                        role="row"
                        style={{
                          gridTemplateColumns: `repeat(${gridMaxCols}, ${GRID_CELL_SIZE}px)`,
                        }}
                      >
                        {Array.from({ length: gridMaxCols }).map(
                          (__, colIndex) => {
                            const col = colIndex + 1;
                            const hoverRows =
                              gridHover?.rows ?? printLayout.rows;
                            const hoverCols =
                              gridHover?.columns ?? printLayout.columns;
                            const isActive =
                              row <= hoverRows && col <= hoverCols;
                            const isSelected =
                              row <= printLayout.rows &&
                              col <= printLayout.columns;
                            return (
                              <button
                                key={`cell-${row}-${col}`}
                                type="button"
                                className={`${styles.gridCell} ${
                                  isActive ? styles.gridCellActive : ""
                                } ${isSelected ? styles.gridCellSelected : ""}`}
                                role="gridcell"
                                aria-label={`${row} rows by ${col} columns`}
                                onMouseEnter={() => handleGridHover(row, col)}
                                onFocus={() => handleGridHover(row, col)}
                                onClick={() => handleGridSelect(row, col)}
                              />
                            );
                          },
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className={styles.layoutHint}>
                  Click a square to set rows and columns.
                </div>
              </div>
            </div>
            <div className={styles.presetSection}>
              <div className={styles.controlLabel}>Quick presets</div>
              <div className={styles.presetGrid}>
                {LAYOUT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`${styles.presetButton} ${
                      isPresetActive(preset) ? styles.presetButtonActive : ""
                    }`}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <span className={styles.presetLabel}>{preset.label}</span>
                    <span className={styles.presetDetail}>{preset.detail}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.layoutSummaryRow}>
              <span className={styles.layoutSummaryChip}>
                {cardsPerSheet} cards per sheet
              </span>
              <span className={styles.layoutSummaryChip}>
                {estimatedSheetCount} sheet
                {estimatedSheetCount === 1 ? "" : "s"} total
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={`${styles.sectionCard} ${styles.resizePanel}`}>
        <div className={styles.resizeHeader}>
          <h4>Text Resize</h4>
          <span className={styles.resizeSummary}>
            {selectedResizeCardIds.length === 0
              ? "Applies to all cards"
              : `${selectedResizeCardIds.length} card(s) selected`}
          </span>
        </div>
        <p className={styles.resizeHelp}>Set overrides on specific cards</p>
        <div className={styles.resizeRuleNote}>
          Card-specific rules override all-cards rules, which override template
          defaults.
        </div>

        <div className={styles.resizeSection}>
          <div className={styles.resizeSectionTitle}>Apply To</div>
          {records.length === 0 ? (
            <div className={styles.resizeEmpty}>No cards loaded yet.</div>
          ) : (
            <div className={styles.resizeCardList}>
              {records.map((record, index) => {
                const isSelected = selectedResizeCardIds.includes(record.id);
                return (
                  <label key={record.id} className={styles.resizeCardItem}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleResizeCard(record.id)}
                    />
                    <span>{getRecordLabel(record, index)}</span>
                  </label>
                );
              })}
            </div>
          )}
          {selectedResizeCardIds.length > 0 && (
            <button
              type="button"
              className={styles.resizeClearButton}
              onClick={onClearResizeSelection}
            >
              Clear selection
            </button>
          )}
        </div>

        <div className={styles.resizeDisclosure}>
          <button
            type="button"
            className={styles.resizeDisclosureButton}
            onClick={() => setShowFieldSizeControls((value) => !value)}
            aria-expanded={showFieldSizeControls}
          >
            <span>
              <span className={styles.resizeSectionTitle}>
                Field Size Overrides
              </span>
              <span className={styles.resizeDisclosureMeta}>
                {svgTemplate?.placeholders.length
                  ? `${svgTemplate.placeholders.length} field${
                      svgTemplate.placeholders.length === 1 ? "" : "s"
                    } available`
                  : "No template fields detected"}
              </span>
            </span>
            <span
              className={styles.resizeDisclosureIndicator}
              aria-hidden="true"
            >
              {showFieldSizeControls ? "Hide" : "Show"}
            </span>
          </button>

          {showFieldSizeControls &&
            (svgTemplate?.placeholders.length ? (
              <ResizeFieldList
                key={
                  selectedResizeCardIds.length
                    ? selectedResizeCardIds.join("|")
                    : "__all__"
                }
                data={{
                  placeholders: svgTemplate.placeholders,
                  templateContent: svgTemplate.content,
                  fieldBaseSizes,
                }}
                resize={{
                  rules: textResizeRules,
                  onChangeRules: setTextResizeRules,
                  selectedCardIds: selectedResizeCardIds,
                }}
              />
            ) : (
              <div className={styles.resizeSection}>
                <div className={styles.resizeEmpty}>
                  No template fields detected.
                </div>
              </div>
            ))}
        </div>
      </div>
    </aside>
  );
};
