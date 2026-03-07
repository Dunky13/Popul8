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
  setLastUsed,
  setSelection,
  type StoredFile,
} from "../../utils/fileHistory";
import { parseSVGTemplate, readSVGFile } from "../../utils/svgManipulator";
import { handleTemplateValidationMessages } from "../../utils/templateValidation";
import { validateTemplate } from "../../utils/validationUtils";
import Icon from "../Icon/Icon";
import {
  UploadPanel,
  UploadPanelActions,
  UploadPanelButton,
} from "../UploadPanel/UploadPanelLegacy";
import styles from "./TemplateUploadLegacy.module.css";

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

  const historyByDay = useMemo(() => {
    return historyItems.reduce<Record<string, StoredFile[]>>((acc, item) => {
      const key = new Date(item.uploadedAt).toISOString().slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [historyItems]);

  const historyDayKeys = useMemo(
    () => Object.keys(historyByDay).sort((a, b) => b.localeCompare(a)),
    [historyByDay],
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
    clearHistory("svg");
    setHistoryItems([]);
    setSelectedHistoryId(null);
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
      {svgTemplate ? (
        <div className={styles.templateInfo}>
          <h4>Template Information</h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>File Name:</span>
              <span className={styles.infoValue}>
                {svgTemplate.fileName || "Unknown"}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Placeholders:</span>
              <span className={styles.infoValue}>
                {svgTemplate.placeholders.length}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Element IDs:</span>
              <span className={styles.infoValue}>
                {svgTemplate.elementIds.length}
              </span>
            </div>
          </div>

          <div className={styles.placeholdersList}>
            <span className={styles.placeholdersLabel}>
              Detected Placeholders:
            </span>
            <div className={styles.placeholders}>
              {svgTemplate.placeholders.length > 0 ? (
                svgTemplate.placeholders.map((placeholder) => (
                  <span key={placeholder} className={styles.placeholder}>
                    {placeholder}
                  </span>
                ))
              ) : (
                <span className={styles.placeholder}>
                  None yet - add them in the Edit Template step.
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {historyItems.length > 0 ? (
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <div>
              <h4>Previous SVG Templates</h4>
              <p className={styles.historyHint}>Pick one template to reuse.</p>
            </div>
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
                      type="radio"
                      name="svg-history"
                      checked={selectedHistoryId === item.id}
                      onChange={() => setSelectedHistoryId(item.id)}
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

      <UploadPanelActions>
        <UploadPanelButton variant="primary" onClick={handleClick}>
          Browse Files
        </UploadPanelButton>
        {svgTemplate ? (
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
        ) : null}
        {svgTemplate ? (
          <UploadPanelButton onClick={handleClearTemplate}>
            Clear Template
          </UploadPanelButton>
        ) : null}
      </UploadPanelActions>
    </UploadPanel>
  );
};
