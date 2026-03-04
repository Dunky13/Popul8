import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { parseCSVContent } from "../utils/csvParser";
import { validateTemplate } from "../utils/validationUtils";
import { validateAndCombineCsvData } from "../utils/csvProcessing";
import { parseSVGTemplate } from "../utils/svgManipulator";
import { resolvePreviousRunSelection } from "./previousRunSelection";
import {
  getLastUsed,
  getSelection,
  getStoredFile,
  getStoredFiles,
  setSelection,
} from "../utils/fileHistory";

export const usePreviousRunLoader = () => {
  const {
    errors,
    addError,
    setLoading,
    setCsvData,
    setSvgTemplate,
    setCsvUploaded,
    setSvgUploaded,
    setSelectedRowIndices,
  } = useAppStore(
    useShallow((state) => ({
      errors: state.errors,
      addError: state.addError,
      setLoading: state.setLoading,
      setCsvData: state.setCsvData,
      setSvgTemplate: state.setSvgTemplate,
      setCsvUploaded: state.setCsvUploaded,
      setSvgUploaded: state.setSvgUploaded,
      setSelectedRowIndices: state.setSelectedRowIndices,
    })),
  );

  const computeHasPreviousRun = useCallback(() => {
    const lastUsed = getLastUsed();
    const fallbackCsvIds = getSelection("csv") as string[];
    const fallbackSvgId = getSelection("svg") as string | null;
    const { csvIds, svgId } = resolvePreviousRunSelection({
      lastUsed,
      fallbackCsvIds,
      fallbackSvgId,
    });
    return csvIds.length > 0 || !!svgId;
  }, []);

  const [hasPreviousRun, setHasPreviousRun] = useState(computeHasPreviousRun);

  useEffect(() => {
    const refreshHasPreviousRun = () => {
      setHasPreviousRun(computeHasPreviousRun());
    };

    window.addEventListener("file-selection-updated", refreshHasPreviousRun);
    window.addEventListener("file-last-used-updated", refreshHasPreviousRun);
    window.addEventListener("storage", refreshHasPreviousRun);

    return () => {
      window.removeEventListener(
        "file-selection-updated",
        refreshHasPreviousRun,
      );
      window.removeEventListener(
        "file-last-used-updated",
        refreshHasPreviousRun,
      );
      window.removeEventListener("storage", refreshHasPreviousRun);
    };
  }, [computeHasPreviousRun]);

  const pushErrorOnce = useCallback(
    (message: string) => {
      if (!errors.includes(message)) {
        addError(message);
      }
    },
    [addError, errors]
  );

  const handleUseLastUsed = useCallback(async () => {
    const lastUsed = getLastUsed();
    const fallbackCsvIds = getSelection("csv") as string[];
    const fallbackSvgId = getSelection("svg") as string | null;
    const { csvIds, svgId } = resolvePreviousRunSelection({
      lastUsed,
      fallbackCsvIds,
      fallbackSvgId,
    });

    if (!csvIds.length && !svgId) {
      pushErrorOnce(
        "No previous run found. Upload files or pick from history first."
      );
      return;
    }

    try {
      setLoading(true);

      if (csvIds.length > 0) {
        const storedCsv = getStoredFiles("csv", csvIds);
        if (storedCsv.length !== csvIds.length) {
          throw new Error(
            "Some previously used CSV files are no longer in history."
          );
        }

        const parsedCsv = await Promise.all(
          storedCsv.map((item) => parseCSVContent(item.content, item.fileName))
        );

        const { combinedData, recordWarnings } =
          validateAndCombineCsvData(parsedCsv);

        if (recordWarnings.length > 0 && import.meta.env.DEV) {
          console.warn("Record validation warnings:", recordWarnings);
        }

        setCsvData(combinedData);
        setSelectedRowIndices(combinedData.rows.map((_, index) => index));
        setCsvUploaded(true);
        setSelection("csv", csvIds);
      }

      if (svgId) {
        const storedSvg = getStoredFile("svg", svgId);
        if (!storedSvg) {
          throw new Error(
            "Previously used SVG template is no longer in history."
          );
        }
        const template = parseSVGTemplate(storedSvg.content, storedSvg.fileName);
        const templateErrors = validateTemplate(template);
        if (templateErrors.length > 0) {
          templateErrors.forEach((error) => {
            if (error.includes("Warning:")) {
              if (import.meta.env.DEV) {
                console.warn(error);
              }
            } else {
              throw new Error(error);
            }
          });
        }
        setSvgTemplate(template);
        setSvgUploaded(true);
        setSelection("svg", storedSvg.id);
      }

    } catch (error) {
      pushErrorOnce(
        `File processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  }, [
    pushErrorOnce,
    setLoading,
    setCsvData,
    setSelectedRowIndices,
    setCsvUploaded,
    setSvgTemplate,
    setSvgUploaded,
  ]);

  return { hasPreviousRun, handleUseLastUsed };
};
