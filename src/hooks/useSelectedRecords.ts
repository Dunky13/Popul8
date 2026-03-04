import { useEffect } from "react";
import type { DataRecord } from "../types/dataRecord";
import type { ParsedData } from "../types/template";
import { csvRowToRecord } from "../types/dataRecord";
import { useAppStore } from "../store/appStore";

type UseSelectedRecordsArgs = {
  csvData: ParsedData | null;
  selectedRowIndices: number[];
};

export const buildSelectedRecords = ({
  csvData,
  selectedRowIndices,
}: UseSelectedRecordsArgs): DataRecord[] => {
  if (!csvData) return [];

  return selectedRowIndices
    .map((rowIndex) => {
      const row = csvData.rows[rowIndex];
      if (!row) return null;
      // Keep IDs anchored to original CSV row indexes so per-record overrides remain stable.
      return csvRowToRecord(row, rowIndex);
    })
    .filter((record): record is DataRecord => record !== null);
};

export const useSelectedRecords = ({
  csvData,
  selectedRowIndices,
}: UseSelectedRecordsArgs) => {
  useEffect(() => {
    const { setRecords } = useAppStore.getState();
    setRecords(
      buildSelectedRecords({
        csvData,
        selectedRowIndices,
      }),
    );
  }, [csvData, selectedRowIndices]);
};
