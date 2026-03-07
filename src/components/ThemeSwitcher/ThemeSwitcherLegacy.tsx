import styles from "./ThemeSwitcherLegacy.module.css";

type Props = {
  themeMode: "light" | "dark";
  onThemeModeChange: (mode: "light" | "dark") => void;
};

export function ThemeSwitcher({
  themeMode,
  onThemeModeChange,
}: Props) {
  const isDark = themeMode === "dark";

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
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={styles.themeIcon}
      >
        {/* Sun */}
        <g className={`${styles.sunGroup} ${isDark ? styles.sunGroupHidden : ""}`}>
          <circle cx="12" cy="12" r="5" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="12" y1="1.5" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22.5" />
            <line x1="1.5" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22.5" y2="12" />
            <line x1="4.2" y1="4.2" x2="6" y2="6" />
            <line x1="18" y1="18" x2="19.8" y2="19.8" />
            <line x1="4.2" y1="19.8" x2="6" y2="18" />
            <line x1="18" y1="6" x2="19.8" y2="4.2" />
          </g>
        </g>

        {/* Moon */}
        <g className={`${styles.moonGroup} ${isDark ? "" : styles.moonGroupHidden}`}>
          <path d="M20.2 14.47A8.7 8.7 0 0 1 9.53 3.8a.75.75 0 0 0-.89-.89A9.5 9.5 0 1 0 21.1 15.36a.75.75 0 0 0-.9-.89Z" fill="currentColor" />
        </g>
      </svg>

      <span className="sr-only">
        {isDark ? "Dark mode" : "Light mode"}
      </span>
    </button>
  );
}
