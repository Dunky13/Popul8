import React from "react";
import { useFeatureFlagVariantKey } from "posthog-js/react";
import { App as RedesignedApp } from "./App";
import { App as LegacyApp } from "./AppLegacy";
import { posthog } from "./lib/posthog";
import styles from "./styles/AppExperiment.module.css";

type UiVariant = "legacy" | "redesign";

const QUERY_PARAM = "uiVariant";
const STORAGE_KEY = "popul8-ui-variant";

const readOverride = (): UiVariant | null => {
  if (typeof window === "undefined") return null;

  const queryValue = new URLSearchParams(window.location.search).get(QUERY_PARAM);
  if (queryValue === "legacy" || queryValue === "redesign") {
    window.localStorage.setItem(STORAGE_KEY, queryValue);
    return queryValue;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (storedValue === "legacy" || storedValue === "redesign") {
    return storedValue;
  }

  return null;
};

const resolveFlagVariant = (variantKey: string | boolean | undefined): UiVariant => {
  if (variantKey === "test" || variantKey === "redesign") {
    return "redesign";
  }
  return "legacy";
};

export const AppExperiment: React.FC = () => {
  const flagVariant = useFeatureFlagVariantKey("new-redesign");
  const [override, setOverride] = React.useState<UiVariant | null>(() =>
    readOverride(),
  );
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    const handlePopState = () => {
      setOverride(readOverride());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const assignedVariant =
    import.meta.env.DEV ? "redesign" : resolveFlagVariant(flagVariant);
  const uiVariant = override ?? assignedVariant;

  const handleVariantChange = (nextVariant: UiVariant) => {
    if (typeof window === "undefined") return;

    startTransition(() => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set(QUERY_PARAM, nextVariant);
      window.history.replaceState({}, "", nextUrl);
      window.localStorage.setItem(STORAGE_KEY, nextVariant);
      setOverride(nextVariant);
      posthog.capture("ui variant manually selected", {
        from_variant: uiVariant,
        to_variant: nextVariant,
        assigned_variant: assignedVariant,
      });
    });
  };

  return (
    <>
      {uiVariant === "redesign" ? <RedesignedApp /> : <LegacyApp />}
      <div className={styles.betaSwitcher}>
        <span className={styles.betaLabel}>
          {uiVariant === "redesign" ? "Beta active" : "New interface"}
        </span>
        <button
          type="button"
          className={`${styles.betaButton} ${
            uiVariant === "redesign" ? styles.betaButtonSecondary : ""
          }`}
          onClick={() =>
            handleVariantChange(
              uiVariant === "redesign" ? "legacy" : "redesign",
            )
          }
          disabled={isPending}
        >
          {uiVariant === "redesign" ? "Leave beta" : "Try beta"}
        </button>
      </div>
    </>
  );
};
