import {
  addFilesToHistoryWithHashes,
  getSelection,
  listHistory,
  setLastUsed,
  setSelection,
} from "./fileHistory";

const DEFAULT_EXAMPLE_DATE = "2026-01-01T12:00:00.000Z";
const DEFAULT_EXAMPLE_CSV_NAME = "example-1.csv";
const SECONDARY_EXAMPLE_CSV_NAME = "example-2.csv";
const DEFAULT_EXAMPLE_SVG_NAME = "example-svg-template.svg";

const DEFAULT_EXAMPLE_CSV_PUBLIC_PATHS = [
  `${import.meta.env.BASE_URL}examples/${DEFAULT_EXAMPLE_CSV_NAME}`,
  `${import.meta.env.BASE_URL}${DEFAULT_EXAMPLE_CSV_NAME}`,
];

const SECONDARY_EXAMPLE_CSV_PUBLIC_PATHS = [
  `${import.meta.env.BASE_URL}examples/${SECONDARY_EXAMPLE_CSV_NAME}`,
  `${import.meta.env.BASE_URL}${SECONDARY_EXAMPLE_CSV_NAME}`,
];

const DEFAULT_EXAMPLE_SVG_PUBLIC_PATHS = [
  `${import.meta.env.BASE_URL}examples/${DEFAULT_EXAMPLE_SVG_NAME}`,
  `${import.meta.env.BASE_URL}${DEFAULT_EXAMPLE_SVG_NAME}`,
];

const fetchFirstAvailable = async (paths: string[]) => {
  let lastError: Error | null = null;

  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${path}`);
      }
      return await response.text();
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown fetch failure");
    }
  }

  throw lastError ?? new Error("No public endpoint returned example file");
};

const readLocalCsvSeed = async () => {
  const csvText = await fetchFirstAvailable(DEFAULT_EXAMPLE_CSV_PUBLIC_PATHS);
  const file = new File([csvText], DEFAULT_EXAMPLE_CSV_NAME, {
    type: "text/csv",
  });
  return { file };
};

const readSecondaryCsvSeed = async () => {
  const csvText = await fetchFirstAvailable(SECONDARY_EXAMPLE_CSV_PUBLIC_PATHS);
  const file = new File([csvText], SECONDARY_EXAMPLE_CSV_NAME, {
    type: "text/csv",
  });
  return { file };
};

const readLocalSvgSeed = async () => {
  const svgText = await fetchFirstAvailable(DEFAULT_EXAMPLE_SVG_PUBLIC_PATHS);
  const file = new File([svgText], DEFAULT_EXAMPLE_SVG_NAME, {
    type: "image/svg+xml",
  });
  return { file };
};

const hasHistoryFileName = (type: "csv" | "svg", fileName: string) => {
  return listHistory(type).some(
    (entry) => entry.fileName.toLowerCase() === fileName.toLowerCase(),
  );
};

const hasCsvSelection = () => {
  const selected = getSelection("csv") as string[];
  return selected.length > 0;
};

const hasSvgSelection = () => {
  const selected = getSelection("svg");
  return typeof selected === "string" && selected.length > 0;
};

export const ensureDefaultExamplesAvailable = async () => {
  const missingCsvNames = [
    DEFAULT_EXAMPLE_CSV_NAME,
    SECONDARY_EXAMPLE_CSV_NAME,
  ].filter((name) => !hasHistoryFileName("csv", name));
  const shouldSeedSvg = !hasHistoryFileName("svg", DEFAULT_EXAMPLE_SVG_NAME);

  if (missingCsvNames.length === 0 && !shouldSeedSvg) {
    return;
  }

  const csvSeedTasks: Promise<{ file: File }>[] = [];
  if (missingCsvNames.includes(DEFAULT_EXAMPLE_CSV_NAME)) {
    csvSeedTasks.push(readLocalCsvSeed());
  }
  if (missingCsvNames.includes(SECONDARY_EXAMPLE_CSV_NAME)) {
    csvSeedTasks.push(readSecondaryCsvSeed());
  }

  const csvSeedsPromise =
    csvSeedTasks.length > 0
      ? Promise.all(csvSeedTasks)
      : Promise.resolve<null | { file: File }[]>(null);
  const svgSeedPromise = shouldSeedSvg
    ? readLocalSvgSeed()
    : Promise.resolve(null);

  const [csvSeeds, svgSeed] = await Promise.all([
    csvSeedsPromise,
    svgSeedPromise,
  ]);

  let selectedCsvId: string | null = null;
  let selectedSvgId: string | null = null;
  let selectedCsvIds: string[] = [];

  if (csvSeeds) {
    const { fileHashes } = await addFilesToHistoryWithHashes(
      "csv",
      csvSeeds.map((seed) => seed.file),
      {
        uploadedAt: DEFAULT_EXAMPLE_DATE,
      },
    );

    if (fileHashes.length > 0) {
      selectedCsvId = fileHashes[0];
      if (!hasCsvSelection()) {
        setSelection("csv", fileHashes);
      }
      selectedCsvIds = (getSelection("csv") as string[]) ?? [];
    }
  }

  if (svgSeed) {
    const { fileHashes } = await addFilesToHistoryWithHashes(
      "svg",
      [svgSeed.file],
      {
        uploadedAt: DEFAULT_EXAMPLE_DATE,
      },
    );
    const [svgHash] = fileHashes;
    if (svgHash) {
      selectedSvgId = svgHash;
      if (!hasSvgSelection()) {
        setSelection("svg", svgHash);
      }
      const selected = getSelection("svg");
      selectedSvgId = typeof selected === "string" ? selected : selectedSvgId;
    }
  }

  if (selectedCsvId || selectedSvgId) {
    setLastUsed({
      csvIds: selectedCsvIds.length > 0 ? selectedCsvIds : undefined,
      svgId: selectedSvgId ?? undefined,
    });
  }
};
