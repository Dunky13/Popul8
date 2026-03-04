/**
 * Application constants and configuration
 */

export const FILE_CONSTRAINTS = {
  MAX_CSV_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_SVG_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_RECORDS: 100,
  LARGE_DATASET_THRESHOLD: 20,
} as const;

export const DATASET_LIMITS = {
  MAX_RECORDS: 100,
  LARGE_DATASET_THRESHOLD: 20,
} as const;

export const PRINT_TIMEOUT = 1000;
export const PROGRESS_RESET_DELAY = 1000;

export const PRINT_LAYOUT = {
  DEFAULT_PAGE_SIZE: "A4",
  DEFAULT_ORIENTATION: "landscape",
  DEFAULT_ROWS: 1,
  DEFAULT_COLUMNS: 4,
  DEFAULT_MARGIN_MM: 10,
  MARGIN_MM: 10,
  PAGE_SIZES_MM: {
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    A3: { width: 297, height: 420 },
    Letter: { width: 215.9, height: 279.4 },
    Legal: { width: 215.9, height: 355.6 },
  },
} as const;

export const VALIDATION = {
  MAPPING_CONFIDENCE_THRESHOLD: 0.7,
  SIMILARITY_THRESHOLD: 0.3,
  MIN_PLACEHOLDER_CONFIDENCE: 0.3,
} as const;

export const APP_EVENTS = {
  PRINT_REQUEST: "popul8:print-request",
} as const;
