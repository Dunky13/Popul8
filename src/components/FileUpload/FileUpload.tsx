/**
 * File upload component with drag and drop support
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { FILE_CONSTRAINTS } from "../../constants";
import { useDragDrop } from "../../hooks/useDragDrop";
import { useFileUpload } from "../../hooks/useFileUpload";
import { posthog } from "../../lib/posthog";
import { useAppStore } from "../../store/appStore";
import type { DataRecord } from "../../types/dataRecord";
import { validateAndCombineCsvData } from "../../utils/csvProcessing";
import { parseCSVContent, parseCSVFile } from "../../utils/csvParser";
import {
  addFilesToHistoryWithHashes,
  clearHistory,
  getLastUsed,
  getSelection,
  hydrateCsvHistoryRowCounts,
  listHistory,
  removeHistoryItem,
  setLastUsed,
  setSelection,
  storedFileToFile,
  type StoredFile,
} from "../../utils/fileHistory";
import {
  parseAcceptedFileRules,
  validateFileInput,
} from "../../utils/fileValidation";
import Icon from "../Icon/Icon";
import {
  UploadPanel,
  UploadPanelActions,
  UploadPanelButton,
} from "../UploadPanel/UploadPanel";
import {
  resolveCsvIdsForAppend,
  syncSelectedCsvFiles,
} from "./csvSelectionHelpers";
import styles from "./FileUpload.module.css";
import {
  resolveTodayHistorySelection,
  toggleCsvHistorySelection,
} from "./historySelectionHelpers";

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  onFileProcessed?: (data: DataRecord[]) => void;
  multiple?: boolean;
}

const compareStoredFiles = (a: StoredFile, b: StoredFile) => {
  const uploadedAtDelta =
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  if (uploadedAtDelta !== 0) return uploadedAtDelta;
  return a.fileName.localeCompare(b.fileName);
};

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = ".csv",
  maxSize = FILE_CONSTRAINTS.MAX_CSV_SIZE,
  onFileProcessed,
  multiple = true,
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
  const [historyItems, setHistoryItems] = useState<StoredFile[]>(() =>
    listHistory("csv"),
  );
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(
    () => new Set(getSelection("csv") as string[]),
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const addFilesInputRef = useRef<HTMLInputElement>(null);
  const acceptedFileRules = useMemo(
    () => parseAcceptedFileRules(accept),
    [accept],
  );

  useEffect(() => {
    setSelection("csv", Array.from(selectedHistoryIds));
  }, [selectedHistoryIds]);

  useEffect(() => {
    const handleSelectionSync = () => {
      const nextSelection = getSelection("csv") as string[];
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
    window.addEventListener("file-selection-updated", handleSelectionSync);
    return () =>
      window.removeEventListener("file-selection-updated", handleSelectionSync);
  }, []);

  useEffect(() => {
    const handleHistorySync = () => {
      setHistoryItems(listHistory("csv"));
    };

    window.addEventListener("file-history-updated", handleHistorySync);
    return () => {
      window.removeEventListener("file-history-updated", handleHistorySync);
    };
  }, []);

  useEffect(() => {
    if (historyItems.every((item) => typeof item.rowCount === "number")) return;

    let isCancelled = false;

    void hydrateCsvHistoryRowCounts().then((updated) => {
      if (isCancelled) return;
      setHistoryItems(updated);
    });

    return () => {
      isCancelled = true;
    };
  }, [historyItems]);

  const applyCombinedCsvData = useCallback(
    (combinedData: typeof csvData, fileCount = 1) => {
      if (!combinedData) return;
      setCsvData(combinedData);
      setSelectedRowIndices(combinedData.rows.map((_, index) => index));
      setCsvUploaded(true);
      posthog.capture("csv uploaded", {
        row_count: combinedData.rows.length,
        column_count: combinedData.headers.length,
        file_count: fileCount,
      });
    },
    [setCsvData, setCsvUploaded, setSelectedRowIndices],
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
        const { items: updated, fileHashes } =
          await addFilesToHistoryWithHashes("csv", [file]);
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
    [applyCombinedCsvData],
  );

  const multiProcessor = useCallback(
    async (files: File[]) => {
      const csvDataList = await Promise.all(
        files.map((file) => parseCSVFile(file)),
      );
      const { combinedData, records, recordWarnings } =
        validateAndCombineCsvData(csvDataList);

      if (recordWarnings.length > 0 && import.meta.env.DEV) {
        console.warn("Record validation warnings:", recordWarnings);
      }

      applyCombinedCsvData(combinedData, files.length);

      try {
        const { items: updated, fileHashes } =
          await addFilesToHistoryWithHashes("csv", files);
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
    [applyCombinedCsvData],
  );

  const validator = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return "Please upload a CSV file";
    }
    return null;
  }, []);

  const {
    uploadProgress,
    fileInputRef,
    handleFileSelect,
    handleClick,
    handleClear,
    processFile,
    processMultipleFiles,
  } = useFileUpload<DataRecord[]>({
    accept,
    maxSize,
    onFileProcessed,
    processor,
    validator,
    multiple,
    multiProcessor,
  });

  const { isDragging, handleDragOver, handleDragLeave, handleDrop } =
    useDragDrop({
      onDrop: (files) => {
        if (files.length > 0) {
          handleFileSelect({
            target: { files },
          } as unknown as React.ChangeEvent<HTMLInputElement>);
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
    const { setCsvData: clearCsvData, setSelectedRowIndices: clearSelection } =
      useAppStore.getState();
    clearCsvData(null);
    clearSelection([]);
  }, [clearErrors, clearRequiredRowOverrides, handleClear, setCsvUploaded]);

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
    [accept, acceptedFileRules, maxSize, validator],
  );

  const handleAddFilesSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
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
          filesArray.map((file) => parseCSVFile(file)),
        );
        const { combinedData, recordWarnings } = validateAndCombineCsvData([
          csvData,
          ...csvDataList,
        ]);

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
          }`,
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
      setLoading,
      validateAppendFile,
    ],
  );

  const selectedHistory = useMemo(
    () => historyItems.filter((item) => selectedHistoryIds.has(item.id)),
    [historyItems, selectedHistoryIds],
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
  }, [
    addError,
    applyCombinedCsvData,
    selectedHistory,
    setCsvData,
    setCsvUploaded,
    setLoading,
    setSelectedRowIndices,
  ]);

  const sortedHistoryItems = useMemo(
    () => [...historyItems].sort(compareStoredFiles),
    [historyItems],
  );
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const hasTodayHistory = useMemo(
    () =>
      sortedHistoryItems.some(
        (item) =>
          new Date(item.uploadedAt).toISOString().slice(0, 10) === todayKey,
      ),
    [sortedHistoryItems, todayKey],
  );

  const toggleHistorySelection = useCallback(
    (id: string) => {
      setSelectedHistoryIds((prev) =>
        toggleCsvHistorySelection({
          currentIds: prev,
          id,
          multiple,
        }),
      );
    },
    [multiple],
  );

  const handleSelectToday = useCallback(() => {
    const todaysItems = sortedHistoryItems.filter(
      (item) =>
        new Date(item.uploadedAt).toISOString().slice(0, 10) === todayKey,
    );
    const ids = resolveTodayHistorySelection({
      todaysIds: todaysItems.map((item) => item.id),
      multiple,
    });
    setSelectedHistoryIds(new Set(ids));
  }, [multiple, sortedHistoryItems, todayKey]);

  const handleUseSelectedHistory = useCallback(async () => {
    if (selectedHistory.length === 0) return;
    const files = selectedHistory.map(storedFileToFile);
    if (files.length > 1 && multiple) {
      await processMultipleFiles(files);
    } else {
      await processFile(files[0]);
    }
  }, [multiple, processFile, processMultipleFiles, selectedHistory]);

  const handleClearCsvHistory = useCallback(() => {
    clearHistory("csv");
    setHistoryItems([]);
    setSelectedHistoryIds(new Set());
    setPendingDeleteId(null);
  }, []);

  const handleDownloadHistoryItem = useCallback((item: StoredFile) => {
    const file = storedFileToFile(item);
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

  const handleDeleteHistoryItem = useCallback((id: string) => {
    setPendingDeleteId((currentPendingId) => {
      if (currentPendingId !== id) {
        return id;
      }

      removeHistoryItem("csv", id);
      return null;
    });
  }, []);

  const handleAddSelectedToCurrent = useCallback(async () => {
    if (!csvData || selectedHistory.length === 0) return;
    try {
      setLoading(true);
      const storedParsed = await Promise.all(
        selectedHistory.map((item) =>
          parseCSVContent(item.content, item.fileName),
        ),
      );
      const { combinedData, recordWarnings } = validateAndCombineCsvData([
        csvData,
        ...storedParsed,
      ]);

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
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setLoading(false);
    }
  }, [
    addError,
    applyCombinedCsvData,
    csvData,
    selectedHistory,
    selectedHistoryIds,
    setLoading,
  ]);

  return (
    <UploadPanel
      tone="csv"
      title="Upload CSV Data"
      description={
        <p>
          {multiple ? "Upload one or more CSV files" : "Upload CSV file"} to
          populate your template.
          {multiple ? (
            <>
              <br />
              <strong>Note:</strong> Multiple files must have matching headers
              to be combined.
            </>
          ) : null}
        </p>
      }
      icon={<Icon name="upload" size={36} />}
      isDragging={isDragging}
      dragText={`Drop your CSV ${multiple ? "file(s)" : "file"} here`}
      dropText={
        <>
          Drag and drop your CSV {multiple ? "file(s)" : "file"} here, or click
          to browse
        </>
      }
      subText={`Maximum file size: ${Math.round(maxSize / 1024 / 1024)}MB per file`}
      browseLabel={multiple ? "Browse CSV Files" : "Browse CSV File"}
      onBrowseClick={handleClick}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      fileInputs={
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileSelect}
          />
          <input
            ref={addFilesInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleAddFilesSelect}
          />
        </>
      }
      uploadProgress={uploadProgress}
      successMessage={
        csvUploaded && !uploadProgress ? (
          <>
            <Icon name="check" size={20} />
            <span>
              {csvData?.fileName?.includes("Combined")
                ? "CSV files combined and uploaded successfully!"
                : "CSV file uploaded successfully!"}
            </span>
          </>
        ) : undefined
      }
    >
      {historyItems.length > 0 ? (
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <div className={styles.historyTitleBlock}>
              <h4>Recent CSV Files</h4>
              <p className={styles.historyHint}>
                Reuse or append a previous upload when you need it.
              </p>
            </div>
            <div className={styles.historyHeaderActions}>
              <span className={styles.historyMetaCount}>
                {historyItems.length} saved
              </span>
            </div>
          </div>

          <div className={styles.historyToolbar}>
            <div className={styles.historySelectionSummary}>
              {selectedHistory.length > 0
                ? `${selectedHistory.length} selected`
                : "Nothing selected"}
            </div>
            <UploadPanelButton
              variant="ghost"
              onClick={handleSelectToday}
              disabled={!hasTodayHistory}
            >
              Select Today&apos;s Files
            </UploadPanelButton>
          </div>

          <div className={styles.historyColumns} aria-hidden="true">
            <span>File</span>
            <span>Rows</span>
            <span>Saved</span>
            <span>Actions</span>
          </div>
          <div className={styles.historyList}>
            {sortedHistoryItems.map((item) => (
              <div
                key={item.id}
                className={`${styles.historyItem} ${
                  selectedHistoryIds.has(item.id)
                    ? styles.historyItemSelected
                    : ""
                }`}
              >
                <input
                  id={`csv-history-${item.id}`}
                  type="checkbox"
                  className={styles.historySelectionControl}
                  checked={selectedHistoryIds.has(item.id)}
                  onChange={() => toggleHistorySelection(item.id)}
                />
                <label
                  htmlFor={`csv-history-${item.id}`}
                  className={styles.historyDetails}
                >
                  <span className={styles.historyName}>{item.fileName}</span>
                </label>
                <span className={styles.historySize}>
                  {item.rowCount ?? 0}
                </span>
                <span className={styles.historyTime}>
                  {new Date(item.uploadedAt).toLocaleDateString()}
                </span>
                <div className={styles.historyActions}>
                  <button
                    type="button"
                    className={styles.historyActionButton}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleDownloadHistoryItem(item);
                    }}
                    aria-label={`Download ${item.fileName}`}
                    title={`Download ${item.fileName}`}
                  >
                    <Icon name="download" size={16} />
                  </button>
                  {pendingDeleteId === item.id ? (
                    <button
                      type="button"
                      className={`${styles.historyActionButton} ${styles.historyConfirmButton}`}
                      autoFocus
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleDeleteHistoryItem(item.id);
                      }}
                      onBlur={() => {
                        setPendingDeleteId((currentPendingId) =>
                          currentPendingId === item.id ? null : currentPendingId,
                        );
                      }}
                    >
                      Are you sure?
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.historyActionButton}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleDeleteHistoryItem(item.id);
                      }}
                      aria-label={`Delete ${item.fileName}`}
                      title={`Delete ${item.fileName}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <UploadPanelActions>
            <UploadPanelButton
              variant="primary"
              onClick={handleUseSelectedHistory}
              disabled={selectedHistory.length === 0}
            >
              Use Selected CSVs
            </UploadPanelButton>
            <UploadPanelButton
              onClick={handleAddSelectedToCurrent}
              disabled={!csvData || selectedHistory.length === 0}
            >
              Add to Current Upload
            </UploadPanelButton>
            <UploadPanelButton
              onClick={handleClearCsvHistory}
              disabled={historyItems.length === 0}
            >
              Clear CSV History
            </UploadPanelButton>
          </UploadPanelActions>
        </div>
      ) : null}

      {csvData ? (
        <UploadPanelActions>
          <UploadPanelButton onClick={handleAddFilesClick}>
            Add Files
          </UploadPanelButton>
          <UploadPanelButton onClick={handleClearData}>
            Clear Data
          </UploadPanelButton>
        </UploadPanelActions>
      ) : null}
    </UploadPanel>
  );
};
