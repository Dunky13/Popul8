/**
 * Row selection component for choosing CSV rows to map/print
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { useShallow } from "zustand/react/shallow";
import { applyRequiredSelectionRules, getMissingRequiredRowIndices } from '../../utils/requiredFields';
import styles from "./RowSelectionLegacy.module.css";

export const RowSelection: React.FC = () => {
  const {
    csvData,
    svgTemplate,
    dataMapping,
    selectedRowIndices,
    setSelectedRowIndices,
    requiredRowOverrides,
    addRequiredRowOverride,
    setRequiredRowOverrides,
    clearRequiredRowOverrides,
    isReadyForSelection
  } = useAppStore(
    useShallow((state) => ({
      csvData: state.csvData,
      svgTemplate: state.svgTemplate,
      dataMapping: state.dataMapping,
      selectedRowIndices: state.selectedRowIndices,
      setSelectedRowIndices: state.setSelectedRowIndices,
      requiredRowOverrides: state.requiredRowOverrides,
      addRequiredRowOverride: state.addRequiredRowOverride,
      setRequiredRowOverrides: state.setRequiredRowOverrides,
      clearRequiredRowOverrides: state.clearRequiredRowOverrides,
      isReadyForSelection: state.isReadyForSelection,
    })),
  );

  const totalRows = csvData?.rows.length ?? 0;
  const selectedCount = selectedRowIndices.length;
  const allSelected = totalRows > 0 && selectedCount === totalRows;
  const someSelected = selectedCount > 0 && selectedCount < totalRows;

  const selectAllRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const missingRequiredRowIndices = useMemo(
    () =>
      getMissingRequiredRowIndices({
        csvData,
        svgTemplate,
        dataMapping
      }),
    [csvData, dataMapping, svgTemplate]
  );

  const missingRequiredSet = useMemo(
    () => new Set(missingRequiredRowIndices),
    [missingRequiredRowIndices]
  );

  const selectedRowSet = useMemo(
    () => new Set(selectedRowIndices),
    [selectedRowIndices]
  );

  const filteredRowIndices = useMemo(() => {
    if (!csvData) return [];
    if (normalizedSearch.length === 0) {
      return csvData.rows.map((_, index) => index);
    }

    return csvData.rows.reduce<number[]>((acc, row, rowIndex) => {
      if (String(rowIndex + 1).includes(normalizedSearch)) {
        acc.push(rowIndex);
        return acc;
      }

      const matchesValue = csvData.headers.some((header) =>
        String(row[header] ?? "").toLowerCase().includes(normalizedSearch)
      );

      if (matchesValue) {
        acc.push(rowIndex);
      }

      return acc;
    }, []);
  }, [csvData, normalizedSearch]);

  const filteredRowSet = useMemo(
    () => new Set(filteredRowIndices),
    [filteredRowIndices]
  );

  const allFilteredSelected =
    filteredRowIndices.length > 0 &&
    filteredRowIndices.every((rowIndex) => selectedRowSet.has(rowIndex));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    const nextSelection = applyRequiredSelectionRules({
      selectedRowIndices,
      missingRequiredRowIndices,
      requiredRowOverrides
    });

    const isSame =
      nextSelection.length === selectedRowIndices.length &&
      nextSelection.every((value, index) => value === selectedRowIndices[index]);

    if (!isSame) {
      setSelectedRowIndices(nextSelection);
    }
  }, [
    missingRequiredRowIndices,
    requiredRowOverrides,
    selectedRowIndices,
    setSelectedRowIndices
  ]);

  const handleToggleAll = (checked: boolean) => {
    if (!csvData) return;
    if (checked && missingRequiredRowIndices.length > 0) {
      const mergedOverrides = new Set([
        ...requiredRowOverrides,
        ...missingRequiredRowIndices
      ]);
      setRequiredRowOverrides(Array.from(mergedOverrides));
    }

    setSelectedRowIndices(
      checked ? csvData.rows.map((_, index) => index) : []
    );
  };

  const handleToggleFiltered = () => {
    if (filteredRowIndices.length === 0) return;

    if (allFilteredSelected) {
      const nextSelection = selectedRowIndices.filter(
        (rowIndex) => !filteredRowSet.has(rowIndex)
      );
      setSelectedRowIndices(nextSelection);
      return;
    }

    const merged = Array.from(
      new Set([...selectedRowIndices, ...filteredRowIndices])
    ).sort((a, b) => a - b);
    setSelectedRowIndices(merged);
  };

  const handleToggleRow = (rowIndex: number) => {
    const isSelected = selectedRowIndices.includes(rowIndex);
    if (!isSelected && missingRequiredSet.has(rowIndex)) {
      addRequiredRowOverride(rowIndex);
    }
    const nextSelection = isSelected
      ? selectedRowIndices.filter((index) => index !== rowIndex)
      : [...selectedRowIndices, rowIndex].sort((a, b) => a - b);

    setSelectedRowIndices(nextSelection);
  };

  const selectionSummary = useMemo(() => {
    if (!csvData) return 'No CSV data loaded.';
    if (totalRows === 0) return 'No rows found in the CSV.';
    if (selectedCount === 0) return 'No rows selected.';
    if (normalizedSearch.length > 0) {
      return `${selectedCount} of ${totalRows} rows selected (${filteredRowIndices.length} visible).`;
    }
    return `${selectedCount} of ${totalRows} rows selected.`;
  }, [csvData, filteredRowIndices.length, normalizedSearch.length, totalRows, selectedCount]);

  if (!isReadyForSelection()) {
    return (
      <div className={styles.rowSelection}>
        <h3>Select Rows</h3>
        <div className={styles.notReady}>
          <p>Please upload a CSV file to choose which rows to print.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.rowSelection}>
      <div className={styles.headerRow}>
        <h3>Select Rows to Map</h3>
        <span className={styles.selectionBadge}>
          {selectedCount} selected
        </span>
      </div>
      <p>
        Choose the CSV rows you want to include. Unselected rows will be ignored
        for printing.
      </p>

      <div className={styles.toolbar}>
        <div className={styles.filterWrap}>
          <label htmlFor="row-filter-input" className={styles.filterLabel}>
            Filter rows
          </label>
          <input
            id="row-filter-input"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={styles.filterInput}
            placeholder="Search any value or row number"
          />
        </div>
        <label className={styles.selectAllLabel}>
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allSelected}
            onChange={(event) => handleToggleAll(event.target.checked)}
          />
          Select all rows
        </label>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => handleToggleAll(!allSelected)}
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={handleToggleFiltered}
          disabled={filteredRowIndices.length === 0}
        >
          {allFilteredSelected ? 'Deselect filtered' : 'Select filtered'}
        </button>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={clearRequiredRowOverrides}
          disabled={requiredRowOverrides.length === 0}
        >
          Reset required overrides
        </button>
        <span className={styles.summary}>{selectionSummary}</span>
        <span className={styles.filterMeta}>
          {filteredRowIndices.length} visible
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxHeader}></th>
              <th className={styles.indexHeader}>#</th>
              {csvData?.headers.map((header) => (
                <th key={header} className={styles.headerCell}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRowIndices.map((rowIndex) => {
              const row = csvData?.rows[rowIndex];
              if (!row || !csvData) return null;
              const isSelected = selectedRowIndices.includes(rowIndex);
              return (
                <tr
                  key={rowIndex}
                  className={isSelected ? styles.selectedRow : undefined}
                >
                  <td className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleRow(rowIndex)}
                    />
                  </td>
                  <td className={styles.indexCell}>{rowIndex + 1}</td>
                  {csvData.headers.map((header) => (
                    <td key={`${rowIndex}-${header}`} className={styles.dataCell}>
                      {row[header] || ''}
                    </td>
                  ))}
                </tr>
              );
            })}
            {filteredRowIndices.length === 0 && (
              <tr>
                <td className={styles.emptyCell} colSpan={(csvData?.headers.length ?? 0) + 2}>
                  No rows match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
