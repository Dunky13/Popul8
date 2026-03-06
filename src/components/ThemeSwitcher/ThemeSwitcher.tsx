import { useId } from "react";
import styles from "./ThemeSwitcher.module.css";

type Props = {
  themeMode: "light" | "dark";
  onThemeModeChange: (mode: "light" | "dark") => void;
};

export function ThemeSwitcher({
  themeMode,
  onThemeModeChange,
}: Props) {
  const isDark = themeMode === "dark";
  const maskId = useId();

  return (
    <button
      type="button"
      className={`${styles.themeSwitcher} ${
        isDark ? styles.themeSwitcherDark : ""
      }`}
      onClick={() => onThemeModeChange(isDark ? "light" : "dark")}
      aria-pressed={isDark}
      aria-label={
        isDark ? "Switch to light mode" : "Switch to dark mode"
      }
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className={styles.iconFrame} aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={styles.themeIcon}
        >
          <defs>
            <mask id={maskId}>
              <rect width="24" height="24" fill="black" />
              <circle cx="12" cy="12" r="5.25" fill="white" />
              <circle
                cx="16.5"
                cy="8"
                r="5.2"
                fill="black"
                className={`${styles.maskCutout} ${
                  isDark ? styles.maskCutoutDark : ""
                }`}
              />
            </mask>
          </defs>

          <g className={`${styles.rays} ${isDark ? styles.raysHidden : ""}`}>
            <line x1="12" y1="1.6" x2="12" y2="4.1" />
            <line x1="12" y1="19.9" x2="12" y2="22.4" />
            <line x1="1.6" y1="12" x2="4.1" y2="12" />
            <line x1="19.9" y1="12" x2="22.4" y2="12" />
            <line x1="4.6" y1="4.6" x2="6.4" y2="6.4" />
            <line x1="17.6" y1="17.6" x2="19.4" y2="19.4" />
            <line x1="4.6" y1="19.4" x2="6.4" y2="17.6" />
            <line x1="17.6" y1="6.4" x2="19.4" y2="4.6" />
          </g>

          <circle
            cx="12"
            cy="12"
            r="5.25"
            className={styles.core}
            mask={`url(#${maskId})`}
          />
        </svg>
      </span>

      <span className="sr-only">
        {isDark ? "Dark mode" : "Light mode"}
      </span>
    </button>
  );
}
