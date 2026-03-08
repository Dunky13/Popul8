/**
 * Local file history utilities (localStorage)
 */

import { parseCSVContent } from "./csvParser";

export type StoredFileType = "csv" | "svg";

export interface StoredFile {
  id: string;
  hash: string;
  fileName: string;
  size: number;
  type: StoredFileType;
  uploadedAt: string;
  content: string;
  rowCount?: number;
}

export interface AddFilesToHistoryResult {
  items: StoredFile[];
  fileHashes: string[];
}

export interface AddFilesToHistoryOptions {
  uploadedAt?: string;
}

interface FileHistory {
  csv: StoredFile[];
  svg: StoredFile[];
}

const STORAGE_KEY = "popul8:file-history";
const SELECTION_KEY = "popul8:file-selection";
const LAST_USED_KEY = "popul8:last-used";
const EMPTY_HISTORY: FileHistory = { csv: [], svg: [] };
const MAX_ITEMS_PER_TYPE = 40;
const MAX_HISTORY_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_STORAGE_BYTES = 4_000_000;
const PINNED_DEFAULT_FILE_NAMES = new Set([
  "example-1.csv",
  "example-2.csv",
  "example-svg-template.svg",
]);

const isPinnedDefaultFile = (fileName: string) =>
  PINNED_DEFAULT_FILE_NAMES.has(fileName.toLowerCase());

const areStringArraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const dispatchFileSelectionUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("file-selection-updated"));
};

const dispatchFileHistoryUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("file-history-updated"));
};

const dispatchFileLastUsedUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("file-last-used-updated"));
};

const getUploadedAtTime = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const estimateBytes = (value: string) => new TextEncoder().encode(value).length;

const isHistoryShape = (value: unknown): value is FileHistory => {
  if (!value || typeof value !== "object") return false;
  const record = value as FileHistory;
  return Array.isArray(record.csv) && Array.isArray(record.svg);
};

const normalizeEntries = (entries: StoredFile[], type: StoredFileType) => {
  const now = Date.now();
  const seen = new Set<string>();
  const normalized = entries
    .filter((entry) => {
      if (!entry || typeof entry !== "object") return false;
      if (!entry.id || !entry.hash || !entry.fileName || !entry.uploadedAt)
        return false;
      if (entry.type !== type) return false;
      const uploadedAt = getUploadedAtTime(entry.uploadedAt);
      if (!uploadedAt) return false;
      if (
        !isPinnedDefaultFile(entry.fileName) &&
        now - uploadedAt > MAX_HISTORY_AGE_MS
      ) {
        return false;
      }
      if (seen.has(entry.hash)) return false;
      seen.add(entry.hash);
      return true;
    })
    .sort(
      (a, b) =>
        getUploadedAtTime(b.uploadedAt) - getUploadedAtTime(a.uploadedAt),
    )
    .slice(0, MAX_ITEMS_PER_TYPE);
  return normalized;
};

const enforceStorageBudget = (history: FileHistory): FileHistory => {
  const next: FileHistory = {
    csv: [...history.csv],
    svg: [...history.svg],
  };

  const removeOldest = () => {
    const csvOldest = next.csv[next.csv.length - 1];
    const svgOldest = next.svg[next.svg.length - 1];
    if (!csvOldest && !svgOldest) return false;
    if (!svgOldest) {
      next.csv.pop();
      return true;
    }
    if (!csvOldest) {
      next.svg.pop();
      return true;
    }
    const csvTime = getUploadedAtTime(csvOldest.uploadedAt);
    const svgTime = getUploadedAtTime(svgOldest.uploadedAt);
    if (csvTime <= svgTime) {
      next.csv.pop();
    } else {
      next.svg.pop();
    }
    return true;
  };

  while (
    estimateBytes(JSON.stringify(next)) > MAX_STORAGE_BYTES &&
    removeOldest()
  ) {
    // Keep dropping oldest files until history fits into budget.
  }

  return next;
};

const normalizeHistory = (history: FileHistory): FileHistory => {
  const normalized = {
    csv: normalizeEntries(history.csv, "csv"),
    svg: normalizeEntries(history.svg, "svg"),
  };
  return enforceStorageBudget(normalized);
};

const loadHistory = (): FileHistory => {
  if (typeof localStorage === "undefined") return EMPTY_HISTORY;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_HISTORY;
  try {
    const parsed = JSON.parse(raw);
    if (!isHistoryShape(parsed)) return EMPTY_HISTORY;
    return normalizeHistory(parsed);
  } catch (error) {
    console.warn("Failed to parse stored file history.", error);
    return EMPTY_HISTORY;
  }
};

const saveHistory = (history: FileHistory) => {
  if (typeof localStorage === "undefined") return;
  try {
    const normalized = normalizeHistory(history);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn("Failed to save file history.", error);
  }
};

const loadSelection = (): { csvIds: string[]; svgId: string | null } => {
  if (typeof localStorage === "undefined") {
    return { csvIds: [], svgId: null };
  }
  const raw = localStorage.getItem(SELECTION_KEY);
  if (!raw) return { csvIds: [], svgId: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      csvIds: Array.isArray(parsed?.csvIds) ? parsed.csvIds : [],
      svgId: typeof parsed?.svgId === "string" ? parsed.svgId : null,
    };
  } catch (error) {
    console.warn("Failed to parse stored selections.", error);
    return { csvIds: [], svgId: null };
  }
};

const saveSelection = (selection: {
  csvIds: string[];
  svgId: string | null;
}) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
  } catch (error) {
    console.warn("Failed to save file selection.", error);
  }
};

const loadLastUsed = (): {
  csvIds: string[];
  svgId: string | null;
  usedAt: string | null;
} => {
  if (typeof localStorage === "undefined") {
    return { csvIds: [], svgId: null, usedAt: null };
  }
  const raw = localStorage.getItem(LAST_USED_KEY);
  if (!raw) return { csvIds: [], svgId: null, usedAt: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      csvIds: Array.isArray(parsed?.csvIds) ? parsed.csvIds : [],
      svgId: typeof parsed?.svgId === "string" ? parsed.svgId : null,
      usedAt: typeof parsed?.usedAt === "string" ? parsed.usedAt : null,
    };
  } catch (error) {
    console.warn("Failed to parse last used files.", error);
    return { csvIds: [], svgId: null, usedAt: null };
  }
};

const saveLastUsed = (payload: {
  csvIds: string[];
  svgId: string | null;
  usedAt: string;
}) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LAST_USED_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to save last used files.", error);
  }
};

const fallbackHash = (content: string) => {
  let hash = 0;
  for (let i = 0; i < content.length; i += 1) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash)}`;
};

const hashContent = async (content: string) => {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return fallbackHash(content);
  }

  const data = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const filterExistingCsvIds = (ids: string[], history: FileHistory) => {
  const idSet = new Set(history.csv.map((entry) => entry.id));
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const id of ids) {
    if (!idSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }

  return normalized;
};

const filterExistingSvgId = (id: string | null, history: FileHistory) => {
  if (!id) return null;
  return history.svg.some((entry) => entry.id === id) ? id : null;
};

const normalizeSelectionState = (history: FileHistory) => {
  const selection = loadSelection();
  const nextSelection = {
    csvIds: filterExistingCsvIds(selection.csvIds, history),
    svgId: filterExistingSvgId(selection.svgId, history),
  };
  saveSelection(nextSelection);
  const selectionChanged =
    !areStringArraysEqual(selection.csvIds, nextSelection.csvIds) ||
    selection.svgId !== nextSelection.svgId;

  const lastUsed = loadLastUsed();
  const nextLastUsed = {
    csvIds: filterExistingCsvIds(lastUsed.csvIds, history),
    svgId: filterExistingSvgId(lastUsed.svgId, history),
    usedAt: lastUsed.usedAt,
  };
  saveLastUsed({
    csvIds: nextLastUsed.csvIds,
    svgId: nextLastUsed.svgId,
    usedAt: nextLastUsed.usedAt ?? new Date().toISOString(),
  });
  const lastUsedChanged =
    !areStringArraysEqual(lastUsed.csvIds, nextLastUsed.csvIds) ||
    lastUsed.svgId !== nextLastUsed.svgId;

  if (selectionChanged) {
    dispatchFileSelectionUpdated();
  }
  if (lastUsedChanged) {
    dispatchFileLastUsedUpdated();
  }
};

export const hashFiles = async (files: File[]): Promise<string[]> => {
  const hashes: string[] = [];
  for (const file of files) {
    const content = await file.text();
    hashes.push(await hashContent(content));
  }
  return hashes;
};

export const listHistory = (type: StoredFileType): StoredFile[] => {
  const history = loadHistory();
  return [...history[type]].sort(
    (a, b) => getUploadedAtTime(b.uploadedAt) - getUploadedAtTime(a.uploadedAt),
  );
};

export const getStoredFiles = (
  type: StoredFileType,
  ids: string[],
): StoredFile[] => {
  if (!ids.length) return [];
  const history = loadHistory();
  return history[type].filter((item) => ids.includes(item.id));
};

export const getStoredFile = (
  type: StoredFileType,
  id: string | null,
): StoredFile | null => {
  if (!id) return null;
  const history = loadHistory();
  return history[type].find((item) => item.id === id) || null;
};

export const addFilesToHistoryWithHashes = async (
  type: StoredFileType,
  files: File[],
  options: AddFilesToHistoryOptions = {},
): Promise<AddFilesToHistoryResult> => {
  if (!files.length) {
    return { items: listHistory(type), fileHashes: [] };
  }
  const history = loadHistory();
  const items = history[type];
  const fileHashes: string[] = [];
  let didMutateHistory = false;

  for (const file of files) {
    const content = await file.text();
    const hash = await hashContent(content);
    fileHashes.push(hash);
    const exists = items.some((item) => item.hash === hash);
    if (exists) continue;

    const uploadedAt = options.uploadedAt
      ? new Date(options.uploadedAt).toISOString()
      : new Date().toISOString();
    let rowCount: number | undefined;
    if (type === "csv") {
      try {
        const parsed = await parseCSVContent(content, file.name);
        rowCount = parsed.rows.length;
      } catch {
        rowCount = 0;
      }
    }

    const storedFile: StoredFile = {
      id: hash,
      hash,
      fileName: file.name,
      size: file.size,
      type,
      uploadedAt,
      content,
      rowCount,
    };

    items.unshift(storedFile);
    didMutateHistory = true;
  }

  const normalizedHistory = normalizeHistory(history);
  saveHistory(normalizedHistory);
  normalizeSelectionState(normalizedHistory);
  if (didMutateHistory) {
    dispatchFileHistoryUpdated();
  }
  return {
    items: listHistory(type),
    fileHashes,
  };
};

export const addFilesToHistory = async (
  type: StoredFileType,
  files: File[],
  options: AddFilesToHistoryOptions = {},
): Promise<StoredFile[]> => {
  const { items } = await addFilesToHistoryWithHashes(type, files, options);
  return items;
};

export const clearHistory = (type?: StoredFileType) => {
  const history = loadHistory();
  const nextHistory: FileHistory = {
    csv: type === "svg" ? history.csv : [],
    svg: type === "csv" ? history.svg : [],
  };
  const didMutateHistory =
    history.csv.length !== nextHistory.csv.length ||
    history.svg.length !== nextHistory.svg.length;
  saveHistory(nextHistory);
  normalizeSelectionState(nextHistory);
  if (didMutateHistory) {
    dispatchFileHistoryUpdated();
  }
};

export const removeHistoryItem = (
  type: StoredFileType,
  id: string,
): StoredFile[] => {
  const history = loadHistory();
  const nextItems = history[type].filter((item) => item.id !== id);

  if (nextItems.length === history[type].length) {
    return listHistory(type);
  }

  const nextHistory: FileHistory = {
    ...history,
    [type]: nextItems,
  };

  saveHistory(nextHistory);
  normalizeSelectionState(nextHistory);
  dispatchFileHistoryUpdated();

  return listHistory(type);
};

export const hydrateCsvHistoryRowCounts = async (): Promise<StoredFile[]> => {
  const history = loadHistory();
  const entriesMissingRowCount = history.csv.filter(
    (entry) => typeof entry.rowCount !== "number",
  );

  if (entriesMissingRowCount.length === 0) {
    return listHistory("csv");
  }

  await Promise.all(
    entriesMissingRowCount.map(async (entry) => {
      try {
        const parsed = await parseCSVContent(entry.content, entry.fileName);
        entry.rowCount = parsed.rows.length;
      } catch {
        entry.rowCount = 0;
      }
    }),
  );

  saveHistory(history);
  return listHistory("csv");
};

export const getSelection = (
  type: StoredFileType,
): string[] | string | null => {
  const history = loadHistory();
  const selection = loadSelection();
  const normalizedCsvIds = filterExistingCsvIds(selection.csvIds, history);
  const normalizedSvgId = filterExistingSvgId(selection.svgId, history);

  if (
    normalizedCsvIds.length !== selection.csvIds.length ||
    normalizedSvgId !== selection.svgId
  ) {
    saveSelection({ csvIds: normalizedCsvIds, svgId: normalizedSvgId });
  }

  if (type === "csv") {
    return normalizedCsvIds;
  }
  return normalizedSvgId;
};

export const setSelection = (
  type: StoredFileType,
  ids: string[] | string | null,
) => {
  const history = loadHistory();
  const currentSelection = loadSelection();
  const nextSelection = {
    csvIds: currentSelection.csvIds,
    svgId: currentSelection.svgId,
  };
  if (type === "csv") {
    const nextCsvIds = Array.isArray(ids) ? ids : [];
    nextSelection.csvIds = filterExistingCsvIds(nextCsvIds, history);
  } else {
    nextSelection.svgId = filterExistingSvgId(
      typeof ids === "string" ? ids : null,
      history,
    );
  }

  const changed =
    !areStringArraysEqual(currentSelection.csvIds, nextSelection.csvIds) ||
    currentSelection.svgId !== nextSelection.svgId;
  if (!changed) return;

  saveSelection(nextSelection);
  dispatchFileSelectionUpdated();
};

export const getLastUsed = () => {
  const history = loadHistory();
  const lastUsed = loadLastUsed();
  const normalized = {
    csvIds: filterExistingCsvIds(lastUsed.csvIds, history),
    svgId: filterExistingSvgId(lastUsed.svgId, history),
    usedAt: lastUsed.usedAt,
  };
  if (
    normalized.csvIds.length !== lastUsed.csvIds.length ||
    normalized.svgId !== lastUsed.svgId
  ) {
    saveLastUsed({
      csvIds: normalized.csvIds,
      svgId: normalized.svgId,
      usedAt: normalized.usedAt ?? new Date().toISOString(),
    });
  }
  return normalized;
};

export const setLastUsed = (payload: {
  csvIds?: string[];
  svgId?: string | null;
}) => {
  const history = loadHistory();
  const current = getLastUsed();
  const next = {
    csvIds: filterExistingCsvIds(payload.csvIds ?? current.csvIds, history),
    svgId: filterExistingSvgId(payload.svgId ?? current.svgId, history),
    usedAt: new Date().toISOString(),
  };
  saveLastUsed(next);

  const changed =
    !areStringArraysEqual(current.csvIds, next.csvIds) ||
    current.svgId !== next.svgId;
  if (changed) {
    dispatchFileLastUsedUpdated();
  }
};

export const storedFileToFile = (stored: StoredFile): File => {
  const type = stored.type === "csv" ? "text/csv" : "image/svg+xml";
  return new File([stored.content], stored.fileName, { type });
};
