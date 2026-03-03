import React from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../store/appStore";
import {
  buildDefaultMapping,
  buildMappingContextKey,
  canReuseMappingInContext,
} from "../utils/mappingDefaults";

export const useDefaultMappingSync = () => {
  const {
    csvData,
    svgTemplate,
    dataMapping,
    mappingContextKey,
    setDataMapping,
    setMappingContextKey,
  } = useAppStore(
    useShallow((state) => ({
      csvData: state.csvData,
      svgTemplate: state.svgTemplate,
      dataMapping: state.dataMapping,
      mappingContextKey: state.mappingContextKey,
      setDataMapping: state.setDataMapping,
      setMappingContextKey: state.setMappingContextKey,
    })),
  );

  React.useEffect(() => {
    if (!csvData || !svgTemplate) {
      if (mappingContextKey !== null) {
        setMappingContextKey(null);
      }
      return;
    }

    const mappingKey = buildMappingContextKey(
      csvData.headers,
      svgTemplate.placeholders,
    );
    if (mappingContextKey === mappingKey) {
      return;
    }

    const shouldReuseMapping = canReuseMappingInContext({
      dataMapping,
      headers: csvData.headers,
      placeholders: svgTemplate.placeholders,
    });

    if (!shouldReuseMapping) {
      setDataMapping(
        buildDefaultMapping({
          headers: csvData.headers,
          placeholders: svgTemplate.placeholders,
        }),
      );
    }

    setMappingContextKey(mappingKey);
  }, [
    csvData,
    dataMapping,
    mappingContextKey,
    setDataMapping,
    setMappingContextKey,
    svgTemplate,
  ]);
};
