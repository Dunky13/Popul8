/**
 * Validation utilities for templates, data, and mappings
 */

import { useMemo } from "react";
import leven from "leven";
import type { SVGTemplate, DataMapping, ParsedData } from "../types/template";
import type { DataRecord } from "../types/dataRecord";
import type { MappingValidationResult } from "../types/mapping";
import { VALIDATION, DATASET_LIMITS } from "../constants";
import { ERROR_MESSAGES } from "../errors/errorMessages";
import { validateSVGTemplate } from "./svgManipulator";
import { validateCSVData } from "./csvParser";

/**
 * Validate SVG template
 */
export const validateTemplate = (template: SVGTemplate): string[] => {
  const errors: string[] = [];
  
  // Basic SVG validation
  errors.push(...validateSVGTemplate(template));
  
  return errors;
};

/**
 * Validate CSV data
 */
export const validateParsedCSV = (csvData: ParsedData): string[] => {
  return validateCSVData(csvData);
};

/**
 * Validate data mapping between template and CSV
 */
export const validateDataMapping = (
  template: SVGTemplate,
  csvData: ParsedData,
  mapping: DataMapping
): MappingValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check all template placeholders are mapped
  const unmappedPlaceholders = template.placeholders.filter(
    key => !mapping[key]
  );
  
  if (unmappedPlaceholders.length > 0) {
    errors.push(ERROR_MESSAGES.MISSING_PLACEHOLDERS_MAPPING(unmappedPlaceholders));
  }
  
  // Check mapped CSV columns exist
  Object.entries(mapping).forEach(([templateKey, csvColumn]) => {
    if (!csvColumn) return;
    if (!csvData.headers.includes(csvColumn)) {
      errors.push(ERROR_MESSAGES.INVALID_MAPPING(templateKey, csvColumn));
    }
  });
  
  // Check for unmapped CSV columns (warnings only)
  const usedColumns = Object.values(mapping);
  const unusedColumns = csvData.headers.filter(
    header => !usedColumns.includes(header)
  );
  
  // Only warn about unused columns when there are unmapped placeholders
  if (unusedColumns.length > 0 && unmappedPlaceholders.length > 0) {
    warnings.push(`Unused CSV columns: ${unusedColumns.join(', ')}`);
  }
  
  // Check for potential mismatches based on common patterns
  const potentialMismatches: string[] = [];
  Object.entries(mapping).forEach(([templateKey, csvColumn]) => {
    const templateLower = templateKey.toLowerCase();
    const columnLower = csvColumn.toLowerCase();
    
    // If neither contains the other, might be mismatched
    if (!templateLower.includes(columnLower) && !columnLower.includes(templateLower)) {
      // Only flag if they're very different
      const similarity = calculateSimilarity(templateLower, columnLower);
      if (similarity < VALIDATION.SIMILARITY_THRESHOLD) {
        potentialMismatches.push(`"${templateKey}" → "${csvColumn}"`);
      }
    }
  });
  
  if (potentialMismatches.length > 0) {
    warnings.push(`Potential mapping mismatches: ${potentialMismatches.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    unmappedPlaceholders,
    invalidColumns: []
  };
};

/**
 * Memoized version for use in components
 */
export const useValidateDataMapping = (
  template: SVGTemplate | null,
  csvData: ParsedData | null,
  mapping: DataMapping
): MappingValidationResult | null => {
  return useMemo(() => {
    if (!template || !csvData) return null;
    return validateDataMapping(template, csvData, mapping);
  }, [template, csvData, mapping]);
};

/**
 * Validate record data.
 */
export const validateRecordData = (records: DataRecord[]): string[] => {
  const errors: string[] = [];
  
  // Check for duplicate names (only for non-empty names)
  const names = records
    .map((record) => String(record.name || "").trim())
    .filter(Boolean);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  const uniqueDuplicates = [...new Set(duplicateNames)];
  
  if (uniqueDuplicates.length > 0) {
    errors.push(ERROR_MESSAGES.DUPLICATE_RECORD_NAMES(uniqueDuplicates));
  }
  
  // Empty values are now allowed - no individual field validation needed
  
  return errors;
};

/**
 * Validate system readiness for printing
 */
export const validatePrintReadiness = (
  template: SVGTemplate | null,
  records: DataRecord[],
  mapping: DataMapping
): { isReady: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check basic requirements
  if (!template) {
    errors.push('No SVG template loaded');
  }
  
  if (records.length === 0) {
    errors.push("No record data to print");
  }
  
  if (Object.keys(mapping).length === 0) {
    errors.push('No data mapping configured');
  }
  
  // Check template placeholders
  if (template && template.placeholders.length > 0) {
    const unmappedPlaceholders = template.placeholders.filter(
      key => !mapping[key]
    );
    if (unmappedPlaceholders.length > 0) {
      errors.push(ERROR_MESSAGES.MISSING_PLACEHOLDERS_MAPPING(unmappedPlaceholders));
    }
  }
  
  if (records.length > DATASET_LIMITS.MAX_RECORDS) {
    errors.push(ERROR_MESSAGES.DATA_TOO_LARGE);
  }
  
  return {
    isReady: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Memoized version for use in components
 */
export const useValidatePrintReadiness = (
  template: SVGTemplate | null,
  records: DataRecord[],
  mapping: DataMapping
) => {
  return useMemo(() => {
    return validatePrintReadiness(template, records, mapping);
  }, [template, records, mapping]);
};

/**
 * Calculate string similarity for potential mismatch detection
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = leven(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}
