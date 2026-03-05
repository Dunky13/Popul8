/**
 * File upload component with drag and drop support
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataRecord } from '../../types/dataRecord';
import { useAppStore } from '../../store/appStore';
import { useShallow } from "zustand/react/shallow";
import { useDragDrop } from '../../hooks/useDragDrop';
import { useFileUpload } from '../../hooks/useFileUpload';
import { parseCSVContent, parseCSVFile } from "../../utils/csvParser";
import { validateAndCombineCsvData } from "../../utils/csvProcessing";
import { FILE_CONSTRAINTS } from '../../constants';
import {
  addFilesToHistoryWithHashes,
  clearHistory,
  getLastUsed,
  getSelection,
  listHistory,
  setLastUsed,
  setSelection,
  storedFileToFile,
  type StoredFile
} from '../../utils/fileHistory';
import { parseAcceptedFileRules, validateFileInput } from '../../utils/fileValidation';
import { resolveCsvIdsForAppend, syncSelectedCsvFiles } from './csvSelectionHelpers';
import {
  resolveTodayHistorySelection,
  toggleCsvHistorySelection,
} from './historySelectionHelpers';
import styles from './FileUpload.module.css';
import Icon from "../Icon/Icon";
import { posthog } from '../../lib/posthog';

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  onFileProcessed?: (data: DataRecord[]) => void;
  multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = '.csv',
  maxSize = FILE_CONSTRAINTS.MAX_CSV_SIZE,
  onFileProcessed,
  multiple = true
}) => {
  const {
    setCsvData,
    clearErrors,
    csvUploaded,
    setCsvUploaded,
    csvData,
    setSelectedRowIndices,
    clearRequiredRowOverrides,
    addError,
    setLoading,
  } = useAppStore(
    useShallow((state) => ({
      setCsvData: state.setCsvData,
      clearErrors: state.clearErrors,
      csvUploaded: state.csvUploaded,
      setCsvUploaded: state.setCsvUploaded,
      csvData: state.csvData,
      setSelectedRowIndices: state.setSelectedRowIndices,
      clearRequiredRowOverrides: state.clearRequiredRowOverrides,
      addError: state.addError,
      setLoading: state.setLoading,
    })),
  );
  const [historyItems, setHistoryItems] = useState<StoredFile[]>(() => listHistory('csv'));
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(
    () => new Set(getSelection('csv') as string[])
  );
  const addFilesInputRef = useRef<HTMLInputElement>(null);
  const acceptedFileRules = useMemo(
    () => parseAcceptedFileRules(accept),
    [accept]
  );

  useEffect(() => {
    setSelection('csv', Array.from(selectedHistoryIds));
  }, [selectedHistoryIds]);

  useEffect(() => {
    const handleSelectionSync = () => {
      const nextSelection = getSelection('csv') as string[];
      setSelectedHistoryIds((prev) => {
        if (
          prev.size === nextSelection.length &&
          nextSelection.every((id) => prev.has(id))
        ) {
          return prev;
        }
        return new Set(nextSelection);
      });
    };
    window.addEventListener('file-selection-updated', handleSelectionSync);
    return () => window.removeEventListener('file-selection-updated', handleSelectionSync);
  }, []);

  const applyCombinedCsvData = useCallback(
    (combinedData: typeof csvData, fileCount = 1) => {
      if (!combinedData) return;
      setCsvData(combinedData);
      setSelectedRowIndices(combinedData.rows.map((_, index) => index));
      setCsvUploaded(true);
      posthog.capture('csv uploaded', {
        row_count: combinedData.rows.length,
        column_count: combinedData.headers.length,
        file_count: fileCount,
      });
    },
    [setCsvData, setCsvUploaded, setSelectedRowIndices]
  );

  const processor = useCallback(
    async (file: File) => {
      const parsed = await parseCSVFile(file);
      const { combinedData, records, recordWarnings } =
        validateAndCombineCsvData([parsed]);

      if (recordWarnings.length > 0 && import.meta.env.DEV) {
        console.warn("Record validation warnings:", recordWarnings);
      }

      applyCombinedCsvData(combinedData, 1);

      try {
        const { items: updated, fileHashes } = await addFilesToHistoryWithHashes(
          "csv",
          [file],
        );
        setHistoryItems(updated);
        const [fileHash] = fileHashes;
        setSelectedHistoryIds(new Set([fileHash]));
        setLastUsed({ csvIds: [fileHash] });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Failed to store CSV file history.", error);
        }
      }

      return records;
    },
    [
      applyCombinedCsvData,
      setHistoryItems,
      setSelectedHistoryIds,
    ]
  );

  const multiProcessor = useCallback(
    async (files: File[]) => {
      const csvDataList = await Promise.all(files.map((file) => parseCSVFile(file)));
      const { combinedData, records, recordWarnings } =
        validateAndCombineCsvData(csvDataList);

      if (recordWarnings.length > 0 && import.meta.env.DEV) {
        console.warn("Record validation warnings:", recordWarnings);
      }

      applyCombinedCsvData(combinedData, files.length);

      try {
        const { items: updated, fileHashes } = await addFilesToHistoryWithHashes(
          "csv",
          files,
        );
        setHistoryItems(updated);
        setSelectedHistoryIds(new Set(fileHashes));
        setLastUsed({ csvIds: fileHashes });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Failed to store CSV file history.", error);
        }
      }

      return records;
    },
    [applyCombinedCsvData, setHistoryItems, setSelectedHistoryIds]
  );

  const validator = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return 'Please upload a CSV file';
    }
    return null;
  }, []);

  const { uploadProgress, fileInputRef, handleFileSelect, handleClick, handleClear, processFile, processMultipleFiles } = useFileUpload<DataRecord[]>({
    accept,
    maxSize,
    onFileProcessed,
    processor,
    validator,
    multiple,
    multiProcessor,
  });

  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useDragDrop({
    onDrop: (files) => {
      if (files.length > 0) {
        handleFileSelect({ target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    },
    accept: [accept],
    multiple,
  });

  const handleClearData = useCallback(() => {
    handleClear();
    clearErrors();
    setCsvUploaded(false);
    clearRequiredRowOverrides();
    const { setCsvData, setSelectedRowIndices } = useAppStore.getState();
    setCsvData(null);
    setSelectedRowIndices([]);
  }, [handleClear, clearErrors, setCsvUploaded, clearRequiredRowOverrides]);

  const handleAddFilesClick = useCallback(() => {
    const input = addFilesInputRef.current;
    if (input) {
      input.multiple = multiple;
      input.click();
    }
  }, [multiple]);

  const validateAppendFile = useCallback(
    (file: File) =>
      validateFileInput({
        file,
        accept,
        maxSize,
        validator,
        acceptedRules: acceptedFileRules,
      }),
    [accept, maxSize, validator, acceptedFileRules]
  );

  const handleAddFilesSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const filesArray = Array.from(files);

      if (!csvData) {
        if (filesArray.length > 1 && multiple) {
          await processMultipleFiles(filesArray);
        } else {
          await processFile(filesArray[0]);
        }
        if (addFilesInputRef.current) {
          addFilesInputRef.current.value = "";
        }
        return;
      }

      try {
        setLoading(true);

        for (const file of filesArray) {
          const validationError = validateAppendFile(file);
          if (validationError) {
            addError(`File "${file.name}": ${validationError}`);
            return;
          }
        }

        const csvDataList = await Promise.all(
          filesArray.map((file) => parseCSVFile(file))
        );
        const { combinedData, recordWarnings } =
          validateAndCombineCsvData([csvData, ...csvDataList]);

        if (recordWarnings.length > 0 && import.meta.env.DEV) {
          console.warn("Record validation warnings:", recordWarnings);
        }

        applyCombinedCsvData(combinedData);
        const { items: updated, fileHashes: newHashes } =
          await addFilesToHistoryWithHashes("csv", filesArray);
        setHistoryItems(updated);
        const mergedCsvIds = resolveCsvIdsForAppend({
          lastUsedCsvIds: getLastUsed().csvIds,
          fallbackSelectedIds: Array.from(selectedHistoryIds),
          appendedIds: newHashes,
        });
        setSelectedHistoryIds(new Set(mergedCsvIds));
        setLastUsed({ csvIds: mergedCsvIds });
      } catch (error) {
        addError(
          `File processing failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
        if (addFilesInputRef.current) {
          addFilesInputRef.current.value = "";
        }
      }
    },
    [
      addError,
      applyCombinedCsvData,
      csvData,
      multiple,
      processFile,
      processMultipleFiles,
      selectedHistoryIds,
      setHistoryItems,
      setSelectedHistoryIds,
      setLoading,
      validateAppendFile,
    ]
  );

  const selectedHistory = useMemo(
    () => historyItems.filter((item) => selectedHistoryIds.has(item.id)),
    [historyItems, selectedHistoryIds]
  );

  useEffect(() => {
    if (selectedHistory.length === 0) {
      setCsvData(null);
      setSelectedRowIndices([]);
      setCsvUploaded(false);
      return;
    }

    const { csvData: previousCsvData, selectedRowIndices } =
      useAppStore.getState();

    void syncSelectedCsvFiles({
      selectedHistory,
      previousCsvData,
      previousSelectedRowIndices: selectedRowIndices,
      applyCombinedCsvData,
      setLoading,
      addError,
      // use hook variable from outer scope instead of destructured one
      updateSelection: setSelectedRowIndices,
      deps: {
        parseContent: parseCSVContent,
        combineCsv: (csvDataList) => validateAndCombineCsvData(csvDataList),
        logWarnings: (warnings) => {
          if (warnings.length > 0 && import.meta.env.DEV) {
            console.warn("Record validation warnings:", warnings);
          }
        },
      },
    });
  }, [addError, applyCombinedCsvData, selectedHistory, setCsvData, setCsvUploaded, setLoading, setSelectedRowIndices]);

  const historyByDay = useMemo(() => {
    return historyItems.reduce<Record<string, StoredFile[]>>((acc, item) => {
      const key = new Date(item.uploadedAt).toISOString().slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [historyItems]);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const historyDayKeys = useMemo(
    () => Object.keys(historyByDay).sort((a, b) => b.localeCompare(a)),
    [historyByDay]
  );

  const toggleHistorySelection = useCallback((id: string) => {
    setSelectedHistoryIds((prev) => {
      return toggleCsvHistorySelection({
        currentIds: prev,
        id,
        multiple,
      });
    });
  }, [multiple]);

  const handleSelectToday = useCallback(() => {
    const todaysItems = historyByDay[todayKey] || [];
    const ids = resolveTodayHistorySelection({
      todaysIds: todaysItems.map((item) => item.id),
      multiple,
    });
    setSelectedHistoryIds(new Set(ids));
  }, [historyByDay, multiple, todayKey]);

  const handleUseSelectedHistory = useCallback(async () => {
    if (selectedHistory.length === 0) return;
    const files = selectedHistory.map(storedFileToFile);
    if (files.length > 1 && multiple) {
      await processMultipleFiles(files);
    } else {
      await processFile(files[0]);
    }
  }, [processFile, processMultipleFiles, selectedHistory, multiple]);

  const handleClearCsvHistory = useCallback(() => {
    clearHistory("csv");
    setHistoryItems([]);
    setSelectedHistoryIds(new Set());
  }, []);

  const handleAddSelectedToCurrent = useCallback(async () => {
    if (!csvData || selectedHistory.length === 0) return;
    try {
      setLoading(true);
      const storedParsed = await Promise.all(
        selectedHistory.map((item) => parseCSVContent(item.content, item.fileName))
      );
      const { combinedData, recordWarnings } =
        validateAndCombineCsvData([csvData, ...storedParsed]);

      if (recordWarnings.length > 0 && import.meta.env.DEV) {
        console.warn("Record validation warnings:", recordWarnings);
      }

      applyCombinedCsvData(combinedData);
      const mergedCsvIds = resolveCsvIdsForAppend({
        lastUsedCsvIds: getLastUsed().csvIds,
        fallbackSelectedIds: Array.from(selectedHistoryIds),
        appendedIds: selectedHistory.map((item) => item.id),
      });
      setSelectedHistoryIds(new Set(mergedCsvIds));
      setLastUsed({ csvIds: mergedCsvIds });
    } catch (error) {
      addError(
        `File processing failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setLoading(false);
    }
  }, [
    addError,
    applyCombinedCsvData,
    csvData,
    selectedHistoryIds,
    selectedHistory,
    setLoading,
    setSelectedHistoryIds,
  ]);

  return (
    <div className={styles.fileUpload}>
      <h3>Upload CSV Data</h3>
      <p>
        {multiple ? 'Upload one or more CSV files' : 'Upload CSV file'} to populate your template.
        {multiple && (
          <>
            <br />
            <strong>Note:</strong> Multiple files must have matching headers to be combined.
          </>
        )}
      </p>

      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className={styles.dropZoneContent}>
          <div className={styles.uploadIcon}>
            <Icon name="upload" size={36} />
          </div>
          
          {isDragging ? (
            <p className={styles.dragText}>
              Drop your CSV {multiple ? 'file(s)' : 'file'} here
            </p>
          ) : (
            <>
              <p className={styles.dropText}>
                Drag and drop your CSV {multiple ? 'file(s)' : 'file'} here, or click to browse
              </p>
              <p className={styles.subText}>
                Maximum file size: {Math.round(maxSize / 1024 / 1024)}MB per file
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className={styles.fileInput}
        />
        <input
          ref={addFilesInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleAddFilesSelect}
          className={styles.fileInput}
        />
      </div>

      {uploadProgress > 0 && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className={styles.progressText}>{uploadProgress}%</span>
        </div>
      )}

      {csvUploaded && !uploadProgress && (
        <div className={styles.successMessage}>
          <Icon name="check" size={20} />
          <span>
            {csvData?.fileName?.includes('Combined') 
              ? 'CSV files combined and uploaded successfully!' 
              : 'CSV file uploaded successfully!'}
          </span>
        </div>
      )}

      {historyItems.length > 0 && (
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <div>
              <h4>Previous CSV Files</h4>
              <p className={styles.historyHint}>Select one or more files to reuse.</p>
            </div>
            <button
              onClick={handleSelectToday}
              className={styles.ghostButton}
              disabled={!historyByDay[todayKey]?.length}
            >
              Select Today&apos;s Files
            </button>
          </div>
          <div className={styles.historyList}>
            {historyDayKeys.map((dayKey) => (
              <div key={dayKey} className={styles.historyGroup}>
                <div className={styles.historyGroupLabel}>
                  {new Date(dayKey).toLocaleDateString()}
                </div>
                {historyByDay[dayKey].map((item) => (
                  <label key={item.id} className={styles.historyItem}>
                    <input
                      type="checkbox"
                      checked={selectedHistoryIds.has(item.id)}
                      onChange={() => toggleHistorySelection(item.id)}
                    />
                    <div className={styles.historyDetails}>
                      <span className={styles.historyName}>{item.fileName}</span>
                      <span className={styles.historyMeta}>
                        Uploaded {new Date(item.uploadedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className={styles.historyActions}>
            <button
              onClick={handleUseSelectedHistory}
              className={styles.primaryButton}
              disabled={selectedHistory.length === 0}
            >
              Use Selected CSVs
            </button>
            <button
              onClick={handleAddSelectedToCurrent}
              className={styles.secondaryButton}
              disabled={!csvData || selectedHistory.length === 0}
            >
              Add to Current Upload
            </button>
            <button
              onClick={handleClearCsvHistory}
              className={styles.secondaryButton}
              disabled={historyItems.length === 0}
            >
              Clear CSV History
            </button>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button 
          onClick={handleClick}
          className={styles.primaryButton}
        >
          Browse Files
        </button>

        {csvData && (
          <button 
            onClick={handleAddFilesClick}
            className={styles.secondaryButton}
          >
            Add Files
          </button>
        )}
        
        <button 
          onClick={handleClearData}
          className={styles.secondaryButton}
        >
          Clear Data
        </button>
      </div>
    </div>
  );
};
