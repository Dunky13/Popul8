/**
 * Shared CSV processing workflow helpers.
 */

import type { DataRecord } from "../types/dataRecord";
import type { ParsedData } from "../types/template";
import { combineCSVData, compareHeaders, csvDataToRecords } from "./csvParser";
import { validateRecordData, validateParsedCSV } from "./validationUtils";

const ensureValidCsvData = (csvDataList: ParsedData[]) => {
  csvDataList.forEach((csvData) => {
    const csvErrors = validateParsedCSV(csvData);
    if (csvErrors.length > 0) {
      throw new Error(
        `Error in ${csvData.fileName ?? "CSV"}: ${csvErrors.join(", ")}`
      );
    }
  });

  const headerValidation = compareHeaders(csvDataList);
  if (!headerValidation.isValid) {
    throw new Error(headerValidation.errors.join(" "));
  }
};

export const validateAndCombineCsvData = (csvDataList: ParsedData[]) => {
  if (csvDataList.length === 0) {
    throw new Error("No CSV data provided");
  }

  if (csvDataList.length > 1) {
    ensureValidCsvData(csvDataList);
  } else {
    const csvErrors = validateParsedCSV(csvDataList[0]);
    if (csvErrors.length > 0) {
      throw new Error(csvErrors.join(", "));
    }
  }

  const combinedData = combineCSVData(csvDataList);
  const records = csvDataToRecords(combinedData);
  const recordWarnings = validateRecordData(records);

  return {
    combinedData,
    records,
    recordWarnings,
  } as { combinedData: ParsedData; records: DataRecord[]; recordWarnings: string[] };
};
