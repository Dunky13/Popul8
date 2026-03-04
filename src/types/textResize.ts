/**
 * Text resize rules for template placeholders.
 */

export type TextResizeUnit = "px" | "percent";

export interface TextResizeValue {
  value: number;
  unit: TextResizeUnit;
}

export interface TextResizeRules {
  allCards: Record<string, TextResizeValue | number>;
  perCard: Record<string, Record<string, TextResizeValue | number>>;
}
