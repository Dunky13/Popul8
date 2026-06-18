import { useEffect, useRef, useState } from "react";
import styles from "./AppRail.module.css";

type AppId = "cards" | "tracker" | "tokens";
type AppDef = { id: AppId; label: string; seg: string };

const APPS: AppDef[] = [
  { id: "cards", label: "Card Generator", seg: "" },
  { id: "tracker", label: "Initiative Tracker", seg: "initiative-tracker/" },
  { id: "tokens", label: "Token Generator", seg: "token-generator/" },
];

/** Site root, resolved from this app's Vite base so links work on previews too. */
function siteRoot(currentSeg: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return currentSeg && base.endsWith(currentSeg)
    ? base.slice(0, base.length - currentSeg.length)
    : base;
}

function RailIcon({ id }: { id: AppId }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (id === "cards") {
    return (
      <svg {...common}>
        <rect x="3.5" y="6.5" width="11" height="14" rx="2" />
        <path d="M9.5 6.5V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-1.5" />
      </svg>
    );
  }
  if (id === "tracker") {
    return (
      <svg {...common}>
        <path d="M12 2.5 20 7v10l-8 4.5L4 17V7z" />
        <path d="M4 7l8 4 8-4M12 11v10.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function AppRail({ current }: { current: AppId }) {
  const seg = APPS.find((a) => a.id === current)?.seg ?? "";
  const root = siteRoot(seg);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <nav
      ref={ref}
      className={`${styles.rail} ${open ? styles.open : ""}`}
      aria-label="Switch app"
    >
      <button
        type="button"
        className={styles.toggle}
        aria-label={open ? "Collapse menu" : "Expand menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.brand}>P8</span>
        <span className={styles.wordmark}>Popul8</span>
      </button>

      <ul className={styles.apps}>
        {APPS.map((a) => {
          const active = a.id === current;
          return (
            <li key={a.id}>
              <a
                className={`${styles.item} ${active ? styles.active : ""}`}
                href={active ? undefined : root + a.seg}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.icon}>
                  <RailIcon id={a.id} />
                </span>
                <span className={styles.label}>{a.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
