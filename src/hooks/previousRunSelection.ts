export type LastUsedSelection = {
  csvIds: string[];
  svgId: string | null;
};

export const resolvePreviousRunSelection = ({
  lastUsed,
  fallbackCsvIds,
  fallbackSvgId,
}: {
  lastUsed: LastUsedSelection;
  fallbackCsvIds: string[];
  fallbackSvgId: string | null;
}) => {
  return {
    csvIds: lastUsed.csvIds.length > 0 ? lastUsed.csvIds : fallbackCsvIds,
    svgId: lastUsed.svgId || fallbackSvgId,
  };
};
