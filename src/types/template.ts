/**
 * SVG Template structure and parsing types
 */

import type { DataRecord } from "./dataRecord";

export interface SVGTemplate {
  content: string;
  placeholders: string[];
  elementIds: string[];
  fileName?: string;
}

/**
 * Data mapping between template placeholders and CSV columns
 */
export interface DataMapping {
  [templateKey: string]: string; // templateKey -> csvColumn
}

/**
 * Parsed CSV data structure
 */
export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  fileName?: string;
}

/**
 * Template processing options
 */
export interface TemplateProcessingOptions {
  includePlaceholders?: boolean;
  validateSVG?: boolean;
  extractImages?: boolean;
}

/**
 * Processed SVG output with replaced data.
 */
export interface ProcessedSheet {
  id: string;
  svgContent: string;
  record: DataRecord;
  errors?: string[];
}
