/**
 * Helpers for applying per-field text resize rules.
 */

import type { TextResizeRules, TextResizeValue } from "../types/textResize";

export const DEFAULT_TEXT_SCALE = 1;

const normalizeValue = (value: TextResizeValue | number): TextResizeValue => {
  if (typeof value === "number") {
    return { value: value * 100, unit: "percent" };
  }

  return value;
};

export const getFieldOverride = (
  rules: TextResizeRules,
  cardId: string,
  field: string
): { override: TextResizeValue; isExplicit: boolean } => {
  const perCard = rules.perCard[cardId];
  if (perCard && Object.prototype.hasOwnProperty.call(perCard, field)) {
    return { override: normalizeValue(perCard[field]), isExplicit: true };
  }

  if (Object.prototype.hasOwnProperty.call(rules.allCards, field)) {
    return { override: normalizeValue(rules.allCards[field]), isExplicit: true };
  }

  return { override: { value: DEFAULT_TEXT_SCALE * 100, unit: "percent" }, isExplicit: false };
};

export const getOverrideForKeys = (
  rules: TextResizeRules,
  cardId: string,
  fields: string[]
): { override: TextResizeValue; isExplicit: boolean } => {
  let hasExplicit = false;
  let minPercent = DEFAULT_TEXT_SCALE * 100;
  let minPx = Infinity;

  fields.forEach((field) => {
    const { override, isExplicit } = getFieldOverride(rules, cardId, field);
    if (!isExplicit) return;
    hasExplicit = true;
    if (override.unit === "px") {
      minPx = Math.min(minPx, override.value);
    } else {
      minPercent = Math.min(minPercent, override.value);
    }
  });

  if (!hasExplicit) {
    return { override: { value: minPercent, unit: "percent" }, isExplicit: false };
  }

  if (minPx !== Infinity) {
    return { override: { value: minPx, unit: "px" }, isExplicit: true };
  }

  return { override: { value: minPercent, unit: "percent" }, isExplicit: true };
};

export const hasActiveTextResize = (
  rules: TextResizeRules,
  cardId: string
): boolean => {
  const keys = new Set([
    ...Object.keys(rules.allCards),
    ...Object.keys(rules.perCard[cardId] || {}),
  ]);

  for (const key of keys) {
    const { override, isExplicit } = getFieldOverride(rules, cardId, key);
    if (!isExplicit) continue;
    if (override.unit === "percent" && Math.abs(override.value - 100) > 0.001) {
      return true;
    }
    if (override.unit === "px") {
      return true;
    }
  }

  return false;
};
