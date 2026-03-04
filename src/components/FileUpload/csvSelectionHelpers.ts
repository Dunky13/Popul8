type ResolveCsvIdsForAppendInput = {
  lastUsedCsvIds: string[];
  fallbackSelectedIds: string[];
  appendedIds: string[];
};

export const mergeUniqueCsvIds = (
  baseIds: string[],
  appendedIds: string[],
): string[] => {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const id of [...baseIds, ...appendedIds]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }

  return merged;
};

export const resolveCsvIdsForAppend = ({
  lastUsedCsvIds,
  fallbackSelectedIds,
  appendedIds,
}: ResolveCsvIdsForAppendInput): string[] => {
  const baseIds =
    lastUsedCsvIds.length > 0 ? lastUsedCsvIds : fallbackSelectedIds;
  return mergeUniqueCsvIds(baseIds, appendedIds);
};
