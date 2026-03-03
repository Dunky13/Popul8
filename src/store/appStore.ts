/**
 * Central application state management using Zustand
 */

import { create } from 'zustand';
import type { DataRecord } from '../types/dataRecord';
import type { SVGTemplate, DataMapping, ParsedData } from '../types/template';
import type { TextResizeRules } from '../types/textResize';
import type { PrintLayout } from '../types/printLayout';
import type { StepId } from '../types/app';
import { PRINT_LAYOUT } from '../constants';
import { getMissingFonts } from '../utils/svgFonts';
import {
  readAdvancedEditorSettings,
  shouldAutoLoadMissingFonts,
} from '../utils/editorPreferences';
import {
  applyRequiredSelectionRules,
  getMissingRequiredRowIndices,
} from '../utils/requiredFields';

interface AppState {
  // File data
  csvData: ParsedData | null;
  svgTemplate: SVGTemplate | null;
  
  // Processed data
  records: DataRecord[];
  dataMapping: DataMapping;
  mappingContextKey: string | null;
  selectedRowIndices: number[];
  requiredRowOverrides: number[];
  textResizeRules: TextResizeRules;
  printLayout: PrintLayout;
  
  // UI state
  isLoading: boolean;
  currentStep: StepId;
  
  // Error handling
  errors: string[];
  warnings: string[];
  
  // Success messages
  csvUploaded: boolean;
  svgUploaded: boolean;
  
  // Actions
  setCsvData: (data: ParsedData | null) => void;
  setSvgTemplate: (template: SVGTemplate | null) => void;
  setRecords: (records: DataRecord[]) => void;
  setDataMapping: (mapping: DataMapping) => void;
  setMappingContextKey: (key: string | null) => void;
  setSelectedRowIndices: (indices: number[]) => void;
  setRequiredRowOverrides: (indices: number[]) => void;
  addRequiredRowOverride: (index: number) => void;
  clearRequiredRowOverrides: () => void;
  setTextResizeRules: (rules: TextResizeRules) => void;
  setPrintLayout: (layout: PrintLayout) => void;
  setCurrentStep: (step: StepId) => void;
  setLoading: (loading: boolean) => void;
  setErrors: (errors: string[]) => void;
  setWarnings: (warnings: string[]) => void;
  addError: (error: string) => void;
  addWarning: (warning: string) => void;
  removeError: (error: string) => void;
  removeWarning: (warning: string) => void;
  clearErrors: () => void;
  clearWarnings: () => void;
  clearAll: () => void;
  setCsvUploaded: (uploaded: boolean) => void;
  setSvgUploaded: (uploaded: boolean) => void;
  removeRequiredRowOverride: (index: number) => void;
  
  // Convenience getters
  isReadyForEdit: () => boolean;
  isEditComplete: () => boolean;
  isReadyForSelection: () => boolean;
  isReadyForMapping: () => boolean;
  isReadyForPreview: () => boolean;
  isReadyForPrint: () => boolean;
}

export const useAppStore = create<AppState>()(
  (set, get) => ({
    // Initial state
    csvData: null,
    svgTemplate: null,
    records: [],
    dataMapping: {},
    mappingContextKey: null,
    selectedRowIndices: [],
    requiredRowOverrides: [],
    textResizeRules: { allCards: {}, perCard: {} },
    printLayout: {
      pageSize: PRINT_LAYOUT.DEFAULT_PAGE_SIZE,
      orientation: PRINT_LAYOUT.DEFAULT_ORIENTATION,
      rows: PRINT_LAYOUT.DEFAULT_ROWS,
      columns: PRINT_LAYOUT.DEFAULT_COLUMNS,
      marginMm: PRINT_LAYOUT.DEFAULT_MARGIN_MM,
    },
    isLoading: false,
    currentStep: 'upload',
    errors: [],
    warnings: [],
    csvUploaded: false,
    svgUploaded: false,

    // Basic setters
    setCsvData: (csvData) => set({ csvData }),
    setSvgTemplate: (svgTemplate) => set({ svgTemplate }),
    setRecords: (records) => set({ records }),
    setMappingContextKey: (mappingContextKey) => set({ mappingContextKey }),
    setDataMapping: (dataMapping) =>
      set((state) => {
        const missingRequiredRowIndices = getMissingRequiredRowIndices({
          csvData: state.csvData,
          svgTemplate: state.svgTemplate,
          dataMapping,
        });

        const nextSelection = applyRequiredSelectionRules({
          selectedRowIndices: state.selectedRowIndices,
          missingRequiredRowIndices,
          requiredRowOverrides: state.requiredRowOverrides,
        });

        const isSameSelection =
          nextSelection.length === state.selectedRowIndices.length &&
          nextSelection.every(
            (value, index) => value === state.selectedRowIndices[index]
          );

        if (isSameSelection) {
          return { dataMapping };
        }

        return {
          dataMapping,
          selectedRowIndices: nextSelection,
        };
      }),
    setSelectedRowIndices: (selectedRowIndices) => set({ selectedRowIndices }),
    setRequiredRowOverrides: (requiredRowOverrides) => set({
      requiredRowOverrides: Array.from(new Set(requiredRowOverrides)).sort((a, b) => a - b)
    }),
    addRequiredRowOverride: (rowIndex) => set((state) => {
      if (state.requiredRowOverrides.includes(rowIndex)) return state;
      return {
        requiredRowOverrides: [...state.requiredRowOverrides, rowIndex].sort((a, b) => a - b)
      };
    }),
    removeRequiredRowOverride: (rowIndex) => set((state) => ({
      requiredRowOverrides: state.requiredRowOverrides.filter((index) => index !== rowIndex)
    })),
    clearRequiredRowOverrides: () => set({ requiredRowOverrides: [] }),
    setTextResizeRules: (textResizeRules) => set({ textResizeRules }),
    setPrintLayout: (printLayout) => set({ printLayout }),
    setCurrentStep: (currentStep) => set({ currentStep }),
    setLoading: (isLoading) => set({ isLoading }),
    setErrors: (errors) => set({ errors }),
    setWarnings: (warnings) => set({ warnings }),

    // Error management
    addError: (error) => set((state) => ({
      errors: [...state.errors, error]
    })),
    
    addWarning: (warning) => set((state) => ({
      warnings: [...state.warnings, warning]
    })),
    
    removeError: (errorToRemove) => set((state) => ({
      errors: state.errors.filter(error => error !== errorToRemove)
    })),
    
    removeWarning: (warningToRemove) => set((state) => ({
      warnings: state.warnings.filter(warning => warning !== warningToRemove)
    })),
    
    clearErrors: () => set({ errors: [] }),
    clearWarnings: () => set({ warnings: [] }),

    // Clear all data
    clearAll: () => set({
      csvData: null,
      svgTemplate: null,
      records: [],
      dataMapping: {},
      mappingContextKey: null,
      selectedRowIndices: [],
      requiredRowOverrides: [],
      textResizeRules: { allCards: {}, perCard: {} },
      printLayout: {
        pageSize: PRINT_LAYOUT.DEFAULT_PAGE_SIZE,
        orientation: PRINT_LAYOUT.DEFAULT_ORIENTATION,
        rows: PRINT_LAYOUT.DEFAULT_ROWS,
        columns: PRINT_LAYOUT.DEFAULT_COLUMNS,
        marginMm: PRINT_LAYOUT.DEFAULT_MARGIN_MM,
      },
      currentStep: 'upload',
      errors: [],
      warnings: [],
      csvUploaded: false,
      svgUploaded: false
    }),

    // Success state setters
    setCsvUploaded: (csvUploaded) => set({ csvUploaded }),
    setSvgUploaded: (svgUploaded) => set({ svgUploaded }),

    // Convenience getters
    isReadyForEdit: () => {
      const { csvData, svgTemplate } = get();
      return svgTemplate !== null && csvData !== null;
    },

    isEditComplete: () => {
      const { svgTemplate } = get();
      if (!svgTemplate) return false;
      const missingFonts = getMissingFonts(svgTemplate.content);
      if (missingFonts.length === 0) return true;

      const advancedSettings = readAdvancedEditorSettings();
      return shouldAutoLoadMissingFonts(advancedSettings);
    },
    isReadyForSelection: () => {
      const { csvData } = get();
      return csvData !== null;
    },

    isReadyForMapping: () => {
      const { csvData, svgTemplate } = get();
      return csvData !== null && svgTemplate !== null;
    },

    isReadyForPreview: () => {
      const { csvData, svgTemplate, dataMapping } = get();
      if (!csvData || !svgTemplate) return false;

      if (svgTemplate.placeholders.length === 0) {
        return true;
      }

      return svgTemplate.placeholders.every((key) => Boolean(dataMapping[key]));
    },

    isReadyForPrint: () => {
      const { isReadyForPreview, selectedRowIndices, records } = get();
      return (
        isReadyForPreview() &&
        selectedRowIndices.length > 0 &&
        records.length > 0
      );
    }
  })
);
