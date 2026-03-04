/**
 * CSV parsing utilities using papaparse
 */

import Papa from "papaparse";
import type { ParsedData } from "../types/template";
import type { DataRecord } from "../types/dataRecord";
import { csvRowToRecord } from "../types/dataRecord";
import { VALIDATION } from "../constants";
import { findBestMatches } from "./fuzzyMatcher";

const filterNonEmptyRows = (rows: Record<string, string>[]) =>
  rows.filter((row) =>
    Object.values(row).some((value) => value && value.trim() !== "")
  );

const buildParsedData = (
  results: Papa.ParseResult<Record<string, string>>,
  fileName?: string
): ParsedData => {
  const headers = results.meta.fields || [];
  const rows = results.data as Record<string, string>[];
  const filteredRows = filterNonEmptyRows(rows);

  return {
    headers,
    rows: filteredRows,
    fileName,
  };
};

/**
 * Parse CSV file content
 */
export const parseCSVFile = (file: File): Promise<ParsedData> => {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        try {
          resolve(buildParsedData(results, file.name));
        } catch (error) {
          reject(
            new Error(
              `Failed to process CSV data: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            )
          );
        }
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        reject(new Error(`CSV parsing failed: ${message}`));
      }
    });
  });
};

/**
 * Parse CSV content string
 */
export const parseCSVContent = (
  content: string,
  fileName?: string
): Promise<ParsedData> => {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        try {
          resolve(buildParsedData(results, fileName));
        } catch (error) {
          reject(
            new Error(
              `Failed to process CSV data: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            )
          );
        }
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        reject(new Error(`CSV parsing failed: ${message}`));
      },
    });
  });
};

/**
 * Convert CSV data to DataRecord objects
 */
export const csvDataToRecords = (csvData: ParsedData): DataRecord[] => {
  return csvData.rows.map((row, index) => csvRowToRecord(row, index));
};

/**
 * Validate CSV data structure
 */
export const validateCSVData = (csvData: ParsedData): string[] => {
  const errors: string[] = [];

  // Check if CSV has any rows (including empty ones)
  if (!csvData.rows || csvData.rows.length === 0) {
    errors.push('CSV file contains no data rows');
    return errors;
  }

  // Only show error if all rows are completely empty
  const nonEmptyRows = filterNonEmptyRows(csvData.rows);

  if (nonEmptyRows.length === 0 && csvData.rows.length > 0) {
    // All rows are empty - this is a warning, not an error
    console.warn('CSV contains only empty rows - will show empty entries');
    return errors;
  }

  // No longer require specific columns - use what's available in the CSV
  // The mapping system will handle column selection

  // Check for duplicate names (only for non-empty names, use any likely name column).
  const nameColumn = csvData.headers.find((header) =>
    header.toLowerCase().includes("name")
  );
  
  if (nameColumn) {
    const names = csvData.rows
      .map((row) => row[nameColumn]?.trim())
      .filter(Boolean);
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    const uniqueDuplicates = [...new Set(duplicateNames)];
    
    if (uniqueDuplicates.length > 0) {
      errors.push(
        `Duplicate names found in column "${nameColumn}": ${uniqueDuplicates.join(", ")}`
      );
    }
  }

  return errors;
};

/**
 * Get CSV statistics
 */
export const getCSVStats = (csvData: ParsedData) => {
  const records = csvDataToRecords(csvData);
  
  return {
    totalRows: csvData.rows.length,
    validRecords: records.length,
    invalidRecords: 0,
    totalErrors: 0,
    headers: csvData.headers,
  };
};

/**
 * Auto-suggest data mapping based on column names
 */
export const suggestMapping = (csvHeaders: string[], templatePlaceholders: string[]) => {
  return findBestMatches(templatePlaceholders, csvHeaders, VALIDATION.MIN_PLACEHOLDER_CONFIDENCE).map(match => ({
    templateKey: match.placeholder,
    csvColumn: match.column,
    confidence: match.confidence
  }));
};

/**
 * Compare CSV headers between multiple files
 */
export const compareHeaders = (csvDataList: ParsedData[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (csvDataList.length < 2) {
    return { isValid: true, errors: [] };
  }

  const firstHeaders = csvDataList[0].headers;
  
  for (let i = 1; i < csvDataList.length; i++) {
    const currentHeaders = csvDataList[i].headers;
    const fileName = csvDataList[i].fileName || `File ${i + 1}`;
    
    // Check if headers match exactly (order doesn't matter)
    const headersMatch = 
      firstHeaders.length === currentHeaders.length &&
      firstHeaders.every(header => currentHeaders.includes(header));
    
    if (!headersMatch) {
      const missingHeaders = firstHeaders.filter(h => !currentHeaders.includes(h));
      const extraHeaders = currentHeaders.filter(h => !firstHeaders.includes(h));
      
      let errorMessage = `Headers don't match in "${fileName}".`;
      
      if (missingHeaders.length > 0) {
        errorMessage += ` Missing: ${missingHeaders.join(', ')}.`;
      }
      
      if (extraHeaders.length > 0) {
        errorMessage += ` Extra: ${extraHeaders.join(', ')}.`;
      }
      
      errors.push(errorMessage);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Combine multiple CSV datasets with matching headers
 */
export const combineCSVData = (csvDataList: ParsedData[]): ParsedData => {
  if (csvDataList.length === 0) {
    throw new Error('No CSV data to combine');
  }
  
  if (csvDataList.length === 1) {
    return csvDataList[0];
  }

  // Use headers from the first file
  const combinedHeaders = csvDataList[0].headers;
  const combinedRows: Record<string, string>[] = [];
  const fileNames: string[] = [];

  // Combine all rows from all files
  csvDataList.forEach((csvData, index) => {
    const fileName = csvData.fileName || `File ${index + 1}`;
    fileNames.push(fileName);
    
    csvData.rows.forEach(row => {
      // Ensure row has all expected headers (fill with empty strings if missing)
      const normalizedRow: Record<string, string> = {};
      combinedHeaders.forEach(header => {
        normalizedRow[header] = row[header] || '';
      });
      combinedRows.push(normalizedRow);
    });
  });

  return {
    headers: combinedHeaders,
    rows: combinedRows,
    fileName: `Combined (${fileNames.join(', ')})`
  };
};
