/**
 * Centralized error messages for better user experience
 */

export const ERROR_MESSAGES = {
  // File handling
  INVALID_FILE_TYPE: (expected: string, actual?: string) => 
    `Expected ${expected} file${actual ? `, got ${actual}` : ''}`,
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit (10MB)',
  FILE_READ_ERROR: 'Failed to read the file. Please try again.',

  // SVG template errors
  INVALID_SVG_FILE: 'Please upload a valid SVG file for the template.',
  SVG_PARSE_ERROR: 'Failed to parse SVG template. Please check the file format.',
  NO_PLACEHOLDERS: 'Template contains no {{placeholder}} elements to map data to.',
  MALFORMED_PLACEHOLDERS: (placeholders: string[]) =>
    `Malformed placeholders found: ${placeholders.join(', ')}`,
  MISSING_SVG_ROOT: 'File does not contain valid SVG content (missing <svg> tag).',

  // CSV parsing errors
  INVALID_CSV_FORMAT: 'The uploaded file is not a valid CSV.',
  EMPTY_CSV_DATA: 'The CSV file contains no data rows.',
  CSV_PARSE_ERROR: 'Failed to parse CSV file. Please check the format and try again.',

  // Data mapping errors
  MISSING_PLACEHOLDERS_MAPPING: (placeholders: string[]) => 
    `Template placeholders not mapped: ${placeholders.join(', ')}`,
  INVALID_MAPPING: (templateKey: string, csvColumn: string) =>
    `Invalid mapping: "${templateKey}" cannot use "${csvColumn}" column (column not found).`,
  MISSING_REQUIRED_COLUMNS: (columns: string[]) =>
    `Required CSV columns missing: ${columns.join(', ')}`,
  CYCLICAL_MAPPING: 'Detected cyclical mapping in template fields.',

  // Record data errors
  MISSING_RECORD_DATA: (field: string) =>
    `Missing required data: ${field}`,
  INVALID_RECORD_NAME: "Name is required and cannot be empty.",
  INVALID_NUMERIC_FIELD: (field: string) =>
    `Invalid value for ${field}: must be a valid number.`,
  DUPLICATE_RECORD_NAMES: (names: string[]) =>
    `Duplicate names found: ${names.join(', ')}`,

  // Validation errors
  VALIDATION_FAILED: 'Data validation failed. Please check all required fields.',
  MAPPING_INCOMPLETE: 'Not all template placeholders have been mapped to CSV columns.',
  DATA_TOO_LARGE: 'Too many records to process. Maximum is 100 per batch.',

  // Print/preview errors
  NO_DATA_TO_PRINT: 'No data available to print.',
  PRINT_FAILED: 'Failed to generate print preview. Please try again.',
  BROWSER_NOT_SUPPORTED: 'Your browser does not support the required printing features.',

  // Generic errors
  NETWORK_ERROR: 'Network error occurred. Please check your connection and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  OPERATION_CANCELLED: 'Operation was cancelled by the user.',
  OPERATION_TIMEOUT: 'Operation timed out. Please try again.'
} as const;

export const WARNING_MESSAGES = {
  // Data warnings
  EMPTY_OPTIONAL_FIELDS: 'Some optional fields are empty. These will be left blank in the output.',
  TRUNCATED_DATA: (field: string, maxLength: number) =>
    `${field} exceeds maximum length and will be truncated to ${maxLength} records.`,
  POTENTIAL_MISMATCH: (templateKey: string, csvColumn: string) =>
    `Possible mismatch: mapping "${templateKey}" to "${csvColumn}" - please verify this is correct.`,

  // Template warnings
  UNCOMMON_PLACEHODLER: (placeholder: string) =>
    `Uncommon placeholder detected: "{{${placeholder}}}" - please verify this is intentional.`,
  MULTIPLE_IMAGES: 'Multiple image elements found in template. Only the first will be used for image placeholders.',

  // Performance warnings
  LARGE_DATASET: (count: number) =>
    `Processing ${count} records may take some time. Consider using smaller batches.`,
  LOW_QUALITY_IMAGES: 'Some images appear to be low resolution and may not print well.',

  // Feature warnings
  LIMITED_BROWSER_SUPPORT: 'Some features may not work fully in your current browser. Chrome is recommended for best results.',
  FALLBACK_MODE: 'Using fallback rendering mode. Some advanced features may be unavailable.'
} as const;

/**
 * Get a user-friendly error message based on error type
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.name === 'ValidationError') {
      return error.message; // ValidationError already has user-friendly message
    }
    if (error.name === 'ParseError') {
      return ERROR_MESSAGES.CSV_PARSE_ERROR;
    }
    if (error.name === 'FileNotFoundError') {
      return ERROR_MESSAGES.FILE_READ_ERROR;
    }
    if (error.name === 'InvalidFileTypeError') {
      return ERROR_MESSAGES.INVALID_FILE_TYPE('CSV or SVG', 'unknown');
    }
    
    // Handle specific error messages
    if (error.message.includes('File size')) {
      return ERROR_MESSAGES.FILE_TOO_LARGE;
    }
    if (error.message.includes('network')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (error.message.includes('timeout')) {
      return ERROR_MESSAGES.OPERATION_TIMEOUT;
    }
    
    return error.message;
  }
  
  return ERROR_MESSAGES.UNKNOWN_ERROR;
};
