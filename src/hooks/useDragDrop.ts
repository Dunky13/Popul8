/**
 * Shared drag and drop functionality hook
 */

import { useState, useCallback, useMemo } from 'react';
import {
  filterDroppedFilesByAcceptedRules,
  normalizeDropAcceptRules,
} from './dragDropUtils';

interface UseDragDropProps {
  onDrop: (files: File[]) => void;
  accept?: string[];
  multiple?: boolean;
}

interface UseDragDropReturn {
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
}

export const useDragDrop = ({ 
  onDrop, 
  accept = [], 
  multiple = false 
}: UseDragDropProps): UseDragDropReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const acceptedRules = useMemo(
    () => normalizeDropAcceptRules(accept),
    [accept],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set to false if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    
    let filteredFiles = filterDroppedFilesByAcceptedRules(files, acceptedRules);

    // Limit to single file if multiple is false
    if (!multiple && filteredFiles.length > 1) {
      filteredFiles = [filteredFiles[0]];
    }

    if (filteredFiles.length > 0) {
      onDrop(filteredFiles);
    }
  }, [acceptedRules, onDrop, multiple]);

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
