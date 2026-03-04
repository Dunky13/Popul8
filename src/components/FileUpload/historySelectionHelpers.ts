export const toggleCsvHistorySelection = ({
  currentIds,
  id,
  multiple,
}: {
  currentIds: Set<string>;
  id: string;
  multiple: boolean;
}): Set<string> => {
  if (!multiple) {
    if (currentIds.has(id)) {
      return new Set();
    }
    return new Set([id]);
  }

  const next = new Set(currentIds);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

export const resolveTodayHistorySelection = ({
  todaysIds,
  multiple,
}: {
  todaysIds: string[];
  multiple: boolean;
}): string[] => {
  if (multiple) return todaysIds;
  return todaysIds.slice(0, 1);
};
