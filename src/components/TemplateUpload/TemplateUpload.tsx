/**
 * SVG template upload component
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { FILE_CONSTRAINTS } from "../../constants";
import { useDragDrop } from "../../hooks/useDragDrop";
import { useFileUpload } from "../../hooks/useFileUpload";
import { posthog } from "../../lib/posthog";
import { useAppStore } from "../../store/appStore";
import type { SVGTemplate } from "../../types/template";
import { buildBootstrappedCsvFromPlaceholders } from "../../utils/bootstrapCsv";
import {
  addFilesToHistoryWithHashes,
  clearHistory,
  getLastUsed,
  getSelection,
  listHistory,
  removeHistoryItem,
  setLastUsed,
  setSelection,
  storedFileToFile,
  type StoredFile,
} from "../../utils/fileHistory";
import {
  extractPlaceholders,
  parseSVGTemplate,
  readSVGFile,
} from "../../utils/svgManipulator";
import { handleTemplateValidationMessages } from "../../utils/templateValidation";
import { validateTemplate } from "../../utils/validationUtils";
import Icon from "../Icon/Icon";
import {
  UploadPanel,
  UploadPanelActions,
  UploadPanelButton,
} from "../UploadPanel/UploadPanel";
import styles from "./TemplateUpload.module.css";

const compareStoredFiles = (a: StoredFile, b: StoredFile) => {
  const uploadedAtDelta =
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  if (uploadedAtDelta !== 0) return uploadedAtDelta;
  return a.fileName.localeCompare(b.fileName);
};

export const TemplateUpload: React.FC = () => {
  const {
    setSvgTemplate,
    clearErrors,
    svgUploaded,
    setSvgUploaded,
    addError,
    setLoading,
    svgTemplate,
  } = useAppStore(
    useShallow((state) => ({
      setSvgTemplate: state.setSvgTemplate,
      clearErrors: state.clearErrors,
      svgUploaded: state.svgUploaded,
      setSvgUploaded: state.setSvgUploaded,
      addError: state.addError,
      setLoading: state.setLoading,
      svgTemplate: state.svgTemplate,
    })),
  );
  const [historyItems, setHistoryItems] = useState<StoredFile[]>(() =>
    listHistory("svg"),
  );
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    () => {
      const lastUsed = getLastUsed();
      if (lastUsed.svgId) return lastUsed.svgId;
      const selection = getSelection("svg");
      return typeof selection === "string" ? selection : null;
    },
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setSelection("svg", selectedHistoryId);
  }, [selectedHistoryId]);

  useEffect(() => {
    const handleSelectionSync = () => {
      const selection = getSelection("svg");
      const nextSelection = typeof selection === "string" ? selection : null;
      setSelectedHistoryId((prev) =>
        prev === nextSelection ? prev : nextSelection,
      );
    };
    window.addEventListener("file-selection-updated", handleSelectionSync);
    return () =>
      window.removeEventListener("file-selection-updated", handleSelectionSync);
  }, []);

  useEffect(() => {
    const handleHistorySync = () => {
      setHistoryItems(listHistory("svg"));
    };

    window.addEventListener("file-history-updated", handleHistorySync);
    return () =>
      window.removeEventListener("file-history-updated", handleHistorySync);
  }, []);

  const handleTemplateWarnings = useCallback((message: string) => {
    if (import.meta.env.DEV) {
      console.warn(message);
    }
  }, []);

  const handleDownloadBootstrappedCsv = useCallback(() => {
    if (!svgTemplate) return;
    const bootstrappedCsv = buildBootstrappedCsvFromPlaceholders(
      svgTemplate.placeholders,
      svgTemplate.fileName,
    );
    if (!bootstrappedCsv) return;

    posthog.capture("bootstrapped csv downloaded", {
      placeholder_count: svgTemplate.placeholders.length,
    });
    const url = URL.createObjectURL(bootstrappedCsv.file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = bootstrappedCsv.file.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [svgTemplate]);

  const processor = useCallback(
    async (file: File) => {
      const template = await readSVGFile(file);

      const templateErrors = validateTemplate(template);
      handleTemplateValidationMessages(templateErrors, handleTemplateWarnings);

      setSvgTemplate(template);
      setSvgUploaded(true);
      posthog.capture("template uploaded", {
        placeholder_count: template.placeholders.length,
        element_id_count: template.elementIds.length,
      });

      try {
        const { items: updated, fileHashes } =
          await addFilesToHistoryWithHashes("svg", [file]);
        setHistoryItems(updated);
        const [uploadedHash] = fileHashes;
        if (uploadedHash) {
          setSelectedHistoryId(uploadedHash);
          setLastUsed({ svgId: uploadedHash });
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Failed to store SVG file history.", error);
        }
      }

      return template;
    },
    [handleTemplateWarnings, setSvgTemplate, setSvgUploaded],
  );

  const validator = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".svg")) {
      return "Please upload an SVG file";
    }
    return null;
  }, []);

  const {
    uploadProgress,
    fileInputRef,
    handleFileSelect,
    handleClick,
    handleClear,
  } = useFileUpload<SVGTemplate>({
    accept: ".svg",
    maxSize: FILE_CONSTRAINTS.MAX_SVG_SIZE,
    processor,
    validator,
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
      accept: [".svg"],
      multiple: false,
    });

  const handleClearTemplate = useCallback(() => {
    handleClear();
    clearErrors();
    setSvgUploaded(false);
    const { setSvgTemplate: clearTemplate } = useAppStore.getState();
    clearTemplate(null);
  }, [clearErrors, handleClear, setSvgUploaded]);

  const selectedHistory = useMemo(
    () => historyItems.find((item) => item.id === selectedHistoryId) || null,
    [historyItems, selectedHistoryId],
  );

  const sortedHistoryItems = useMemo(
    () => [...historyItems].sort(compareStoredFiles),
    [historyItems],
  );
  const historyPlaceholderCounts = useMemo(
    () =>
      Object.fromEntries(
        historyItems.map((item) => [
          item.id,
          extractPlaceholders(item.content).length,
        ]),
      ),
    [historyItems],
  );
  const handleUseSelectedHistory = useCallback(async () => {
    if (!selectedHistory) return;
    try {
      setLoading(true);
      const template = parseSVGTemplate(
        selectedHistory.content,
        selectedHistory.fileName,
      );
      const templateErrors = validateTemplate(template);
      handleTemplateValidationMessages(templateErrors, handleTemplateWarnings);
      setSvgTemplate(template);
      setSvgUploaded(true);
      setSelectedHistoryId(selectedHistory.id);
      setLastUsed({ svgId: selectedHistory.id });
      posthog.capture("template from history used", {
        placeholder_count: template.placeholders.length,
        element_id_count: template.elementIds.length,
      });
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
    handleTemplateWarnings,
    selectedHistory,
    setLoading,
    setSvgTemplate,
    setSvgUploaded,
  ]);

  const handleClearSvgHistory = useCallback(() => {
    handleClear();
    clearErrors();
    clearHistory("svg");
    setSvgUploaded(false);
    setSvgTemplate(null);
    setHistoryItems([]);
    setSelectedHistoryId(null);
    setPendingDeleteId(null);
  }, [clearErrors, handleClear, setSvgTemplate, setSvgUploaded]);

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

      removeHistoryItem("svg", id);
      return null;
    });
  }, []);

  return (
    <UploadPanel
      tone="svg"
      title="Upload SVG Template"
      description={
        <p>
          Upload SVG template with {"{{placeholder}}"} elements. Example:
          {" {{name}}, {{title}}"}, etc.
        </p>
      }
      icon={<Icon name="image" size={36} />}
      isDragging={isDragging}
      dragText="Drop your SVG file here"
      dropText={<>Drag and drop your SVG template, or click to browse</>}
      subText={`Maximum file size: ${Math.round(
        FILE_CONSTRAINTS.MAX_SVG_SIZE / 1024 / 1024,
      )}MB • Only SVG files accepted`}
      browseLabel="Browse SVG File"
      onBrowseClick={handleClick}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      fileInputs={
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          onChange={handleFileSelect}
        />
      }
      uploadProgress={uploadProgress}
      successMessage={
        svgUploaded && !uploadProgress ? (
          <>
            <Icon name="check" size={20} />
            <span>SVG template uploaded successfully!</span>
          </>
        ) : undefined
      }
    >
      {historyItems.length > 0 ? (
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <div className={styles.historyTitleBlock}>
              <h4>Recent SVG Templates</h4>
              <p className={styles.historyHint}>
                Reuse an existing template when needed.
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
              {selectedHistory ? "1 selected" : "Nothing selected"}
            </div>
          </div>
          <div className={styles.historyColumns} aria-hidden="true">
            <span>Template</span>
            <span>Placeholders</span>
            <span>Saved</span>
            <span>Actions</span>
          </div>
          <div className={styles.historyList}>
            {sortedHistoryItems.map((item) => (
              <div
                key={item.id}
                className={`${styles.historyItem} ${
                  selectedHistoryId === item.id
                    ? styles.historyItemSelected
                    : ""
                }`}
              >
                <input
                  id={`svg-history-${item.id}`}
                  type="radio"
                  name="svg-history"
                  className={styles.historySelectionControl}
                  checked={selectedHistoryId === item.id}
                  onChange={() => setSelectedHistoryId(item.id)}
                />
                <label
                  htmlFor={`svg-history-${item.id}`}
                  className={styles.historyDetails}
                >
                  <span className={styles.historyName}>{item.fileName}</span>
                </label>
                <span className={styles.historyCount}>
                  {historyPlaceholderCounts[item.id] ?? 0}
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
              disabled={!selectedHistory}
            >
              Use Selected Template
            </UploadPanelButton>
            <UploadPanelButton
              onClick={handleClearSvgHistory}
              disabled={historyItems.length === 0}
            >
              Clear SVG History
            </UploadPanelButton>
          </UploadPanelActions>
        </div>
      ) : null}

      {svgTemplate ? (
        <UploadPanelActions>
          <UploadPanelButton
            onClick={handleDownloadBootstrappedCsv}
            disabled={svgTemplate.placeholders.length === 0}
            title={
              svgTemplate.placeholders.length > 0
                ? "Download CSV scaffold with detected placeholders."
                : "No placeholders found to bootstrap."
            }
          >
            Download Bootstrapped CSV
          </UploadPanelButton>
          <UploadPanelButton onClick={handleClearTemplate}>
            Clear Template
          </UploadPanelButton>
        </UploadPanelActions>
      ) : null}
    </UploadPanel>
  );
};
