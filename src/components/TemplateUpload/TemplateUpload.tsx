/**
 * SVG template upload component
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { SVGTemplate } from '../../types/template';
import { useAppStore } from '../../store/appStore';
import { useShallow } from "zustand/react/shallow";
import { useDragDrop } from '../../hooks/useDragDrop';
import { useFileUpload } from '../../hooks/useFileUpload';
import { parseSVGTemplate, readSVGFile } from '../../utils/svgManipulator';
import { validateTemplate } from '../../utils/validationUtils';
import { handleTemplateValidationMessages } from '../../utils/templateValidation';
import { FILE_CONSTRAINTS } from '../../constants';
import { addFilesToHistoryWithHashes, clearHistory, getLastUsed, getSelection, listHistory, setLastUsed, setSelection, type StoredFile } from '../../utils/fileHistory';
import styles from './TemplateUpload.module.css';
import Icon from "../Icon/Icon";

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
  const [historyItems, setHistoryItems] = useState<StoredFile[]>(() => listHistory('svg'));
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(() => {
    const lastUsed = getLastUsed();
    if (lastUsed.svgId) return lastUsed.svgId;
    const selection = getSelection('svg');
    return typeof selection === 'string' ? selection : null;
  });

  useEffect(() => {
    setSelection('svg', selectedHistoryId);
  }, [selectedHistoryId]);

  useEffect(() => {
    const handleSelectionSync = () => {
      const selection = getSelection('svg');
      const nextSelection = typeof selection === 'string' ? selection : null;
      setSelectedHistoryId((prev) =>
        prev === nextSelection ? prev : nextSelection
      );
    };
    window.addEventListener('file-selection-updated', handleSelectionSync);
    return () => window.removeEventListener('file-selection-updated', handleSelectionSync);
  }, []);

  const handleTemplateWarnings = useCallback((message: string) => {
    if (import.meta.env.DEV) {
      console.warn(message);
    }
  }, []);

  const processor = useCallback(async (file: File) => {
    const template = await readSVGFile(file);
    
    const templateErrors = validateTemplate(template);
    handleTemplateValidationMessages(templateErrors, handleTemplateWarnings);

    setSvgTemplate(template);
    setSvgUploaded(true);
    try {
      const { items: updated, fileHashes } = await addFilesToHistoryWithHashes(
        "svg",
        [file],
      );
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
  }, [handleTemplateWarnings, setSvgTemplate, setSvgUploaded]);

  const validator = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.svg')) {
      return 'Please upload an SVG file';
    }
    return null;
  }, []);

  const { uploadProgress, fileInputRef, handleFileSelect, handleClick, handleClear } = useFileUpload<SVGTemplate>({
    accept: '.svg',
    maxSize: FILE_CONSTRAINTS.MAX_SVG_SIZE,

    processor,
    validator,
  });

  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useDragDrop({
    onDrop: (files) => {
      if (files.length > 0) {
        handleFileSelect({ target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    },
    accept: ['.svg'],
    multiple: false,
  });

  const handleClearTemplate = useCallback(() => {
    handleClear();
    clearErrors();
    setSvgUploaded(false);
    const { setSvgTemplate } = useAppStore.getState();
    setSvgTemplate(null);
  }, [handleClear, clearErrors, setSvgUploaded]);

  const selectedHistory = useMemo(
    () => historyItems.find((item) => item.id === selectedHistoryId) || null,
    [historyItems, selectedHistoryId]
  );

  const handleUseSelectedHistory = useCallback(async () => {
    if (!selectedHistory) return;
    try {
      setLoading(true);
      const template = parseSVGTemplate(selectedHistory.content, selectedHistory.fileName);
      const templateErrors = validateTemplate(template);
      handleTemplateValidationMessages(templateErrors, handleTemplateWarnings);
      setSvgTemplate(template);
      setSvgUploaded(true);
      setSelectedHistoryId(selectedHistory.id);
      setLastUsed({ svgId: selectedHistory.id });
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
    <div className={styles.templateUpload}>
      <h3>Upload SVG Template</h3>
      <p>
        Upload SVG template with {'{{placeholder}}'} elements.
        Example: {'{{name}}'}, {'{{title}}'}, etc.
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
            <Icon name="image" size={36} />
          </div>
          
          {isDragging ? (
            <p className={styles.dragText}>Drop your SVG file here</p>
          ) : (
            <>
              <p className={styles.dropText}>
                Drag and drop your SVG template, or click to browse
              </p>
              <p className={styles.subText}>
                Maximum file size: {Math.round(FILE_CONSTRAINTS.MAX_SVG_SIZE / 1024 / 1024)}MB • Only SVG files accepted
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          onChange={handleFileSelect}
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

      {svgUploaded && !uploadProgress && (
        <div className={styles.successMessage}>
          <Icon name="check" size={20} />
          <span>SVG template uploaded successfully!</span>
        </div>
      )}

      {svgTemplate && (
        <div className={styles.templateInfo}>
          <h4>Template Information</h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>File Name:</span>
              <span className={styles.infoValue}>{svgTemplate.fileName || 'Unknown'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Placeholders:</span>
              <span className={styles.infoValue}>{svgTemplate.placeholders.length}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Element IDs:</span>
              <span className={styles.infoValue}>{svgTemplate.elementIds.length}</span>
            </div>
          </div>
          
          {svgTemplate.placeholders.length > 0 && (
            <div className={styles.placeholdersList}>
              <span className={styles.placeholdersLabel}>Detected Placeholders:</span>
              <div className={styles.placeholders}>
                {svgTemplate.placeholders.map(placeholder => (
                  <span key={placeholder} className={styles.placeholder}>
                    {placeholder}
                  </span>
                ))}
              </div>
            </div>
          )}
          {svgTemplate.placeholders.length === 0 && (
            <div className={styles.placeholdersList}>
              <span className={styles.placeholdersLabel}>Detected Placeholders:</span>
              <div className={styles.placeholders}>
                <span className={styles.placeholder}>None yet — add them in the Edit Template step.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {historyItems.length > 0 && (
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <div>
              <h4>Previous SVG Templates</h4>
              <p className={styles.historyHint}>Pick one template to reuse.</p>
            </div>
          </div>
          <div className={styles.historyList}>
            {historyItems.map((item) => (
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
                    Uploaded {new Date(item.uploadedAt).toLocaleString()}
                  </span>
                </div>
              </label>
            ))}
          </div>

          <div className={styles.historyActions}>
            <button
              onClick={handleUseSelectedHistory}
              className={styles.primaryButton}
              disabled={!selectedHistory}
            >
              Use Selected Template
            </button>
            <button
              onClick={handleClearSvgHistory}
              className={styles.secondaryButton}
              disabled={historyItems.length === 0}
            >
              Clear SVG History
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
        
          {svgTemplate && (
            <button 
              onClick={handleClearTemplate}
              className={styles.secondaryButton}
            >
              Clear Template
            </button>
          )}
      </div>
    </div>
  );
};
