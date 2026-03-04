/**
 * Shared file upload functionality hook
 */

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useAppStore } from "../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { PROGRESS_RESET_DELAY } from "../constants";
import { parseAcceptedFileRules, validateFileInput } from "../utils/fileValidation";

interface UseFileUploadProps<T = unknown> {
  accept?: string;
  maxSize?: number;
  onFileProcessed?: (data: T) => void;
  processor: (file: File) => Promise<T>;
  validator?: (file: File) => string | null;
  multiple?: boolean;
  multiProcessor?: (files: File[]) => Promise<T>;
}

interface UseFileUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  processFile: (file: File) => Promise<void>;
  processMultipleFiles: (files: File[]) => Promise<void>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleClick: () => void;
  handleClear: () => void;
}

export const useFileUpload = <T = unknown>({
  accept,
  maxSize,
  onFileProcessed,
  processor,
  validator,
  multiple = true,
  multiProcessor,
}: UseFileUploadProps<T>): UseFileUploadReturn => {
  const { setLoading, addError } = useAppStore(
    useShallow((state) => ({
      setLoading: state.setLoading,
      addError: state.addError,
    })),
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressResetTimeoutRef = useRef<number | null>(null);
  const acceptedFileRules = useMemo(
    () => parseAcceptedFileRules(accept),
    [accept],
  );

  const clearProgressResetTimer = useCallback(() => {
    if (progressResetTimeoutRef.current !== null) {
      window.clearTimeout(progressResetTimeoutRef.current);
      progressResetTimeoutRef.current = null;
    }
  }, []);

  const scheduleProgressReset = useCallback(() => {
    clearProgressResetTimer();
    progressResetTimeoutRef.current = window.setTimeout(() => {
      setUploadProgress(0);
      progressResetTimeoutRef.current = null;
    }, PROGRESS_RESET_DELAY);
  }, [clearProgressResetTimer]);

  useEffect(
    () => () => {
      clearProgressResetTimer();
    },
    [clearProgressResetTimer],
  );

  const validateFile = useCallback(
    (file: File): string | null => {
      return validateFileInput({
        file,
        accept,
        maxSize,
        validator,
        acceptedRules: acceptedFileRules,
      });
    },
    [accept, acceptedFileRules, maxSize, validator],
  );

  const processFile = useCallback(
    async (file: File) => {
      try {
        setLoading(true);
        setUploadProgress(0);

        const validationError = validateFile(file);
        if (validationError) {
          addError(validationError);
          return;
        }

        setUploadProgress(25);

        // Process the file
        const result = await processor(file);
        setUploadProgress(75);

        setUploadProgress(100);

        // Notify parent component
        if (onFileProcessed) {
          onFileProcessed(result);
        }
      } catch (error) {
        addError(
          `File processing failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
        scheduleProgressReset();
      }
    },
    [
      processor,
      onFileProcessed,
      setLoading,
      addError,
      scheduleProgressReset,
      validateFile,
    ],
  );

  const processMultipleFiles = useCallback(
    async (files: File[]) => {
      try {
        setLoading(true);
        setUploadProgress(0);

        for (const file of files) {
          const validationError = validateFile(file);
          if (validationError) {
            addError(`File "${file.name}": ${validationError}`);
            return;
          }
        }

        setUploadProgress(25);

        // Process multiple files
        const result = multiProcessor
          ? await multiProcessor(files)
          : await processor(files[0]);
        setUploadProgress(75);

        setUploadProgress(100);

        // Notify parent component
        if (onFileProcessed) {
          onFileProcessed(result);
        }
      } catch (error) {
        addError(
          `File processing failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
        scheduleProgressReset();
      }
    },
    [
      processor,
      multiProcessor,
      onFileProcessed,
      setLoading,
      addError,
      scheduleProgressReset,
      validateFile,
    ],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        if (multiple && files.length > 1) {
          processMultipleFiles(Array.from(files));
        } else {
          processFile(files[0]);
        }
      }
    },
    [multiple, processFile, processMultipleFiles]
  );

  const handleClick = useCallback(() => {
    const fileInput = fileInputRef.current;
    if (fileInput) {
      // Ensure the multiple attribute is set correctly
      fileInput.multiple = multiple;
      // Reset value so selecting the same file again still triggers change.
      fileInput.value = "";
      fileInput.click();
    }
  }, [multiple]);

  const handleClear = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    clearProgressResetTimer();
    setUploadProgress(0);
  }, [clearProgressResetTimer]);

  return {
    isUploading: uploadProgress > 0,
    uploadProgress,
    fileInputRef,
    processFile,
    processMultipleFiles,
    handleFileSelect,
    handleClick,
    handleClear,
  };
};
