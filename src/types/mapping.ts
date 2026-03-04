/**
 * Data mapping related types
 */

export interface MappingSuggestion {
  templateKey: string;
  suggestedColumn: string;
  confidence: number; // 0-1, how confident we are about this match
}

export interface MappingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  unmappedPlaceholders: string[];
  invalidColumns: string[];
}

export interface MappingRule {
  templateKey: string;
  csvColumn: string;
  required: boolean;
  transformer?: (value: string) => string; // Function to transform the value
}