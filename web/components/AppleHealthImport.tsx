"use client";

import { useRef, useState } from "react";
import {
  parseAppleHealthExport,
  mergeAppleHealthImport,
  type AppleHealthImportResult,
} from "@/lib/appleHealth";
import styles from "@/app/settings/page.module.css";

type Stage = "idle" | "reading" | "parsed" | "merging" | "done" | "error";

export function AppleHealthImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AppleHealthImportResult | null>(null);
  const [merged, setMerged] = useState<{ sleepAdded: number; workoutsAdded: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStage("reading");
    setProgress(0);
    setError(null);
    setResult(null);
    setMerged(null);
    try {
      const parsed = await parseAppleHealthExport(file, setProgress);
      setResult(parsed);
      setStage("parsed");
    } catch {
      setError("Couldn't read that file — make sure it's the export.xml from Apple Health's \"Export All Health Data\".");
      setStage("error");
    }
  }

  function handleImport() {
    if (!result) return;
    setStage("merging");
    const outcome = mergeAppleHealthImport(result);
    setMerged(outcome);
    setStage("done");
    setTimeout(() => window.location.reload(), 1200);
  }

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>Apple Health export</span>
      <p className={styles.sectionSub} style={{ margin: 0 }}>
        In the iPhone Health app: your profile photo → <em>Export All Health Data</em> → share the
        zip to this device, unzip it, and select the <code>export.xml</code> inside. It&apos;s
        parsed right here in your browser — the file never leaves this device.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".xml"
        className="srOnly"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div style={{ display: "flex", gap: "0.6em", flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className={styles.btn} onClick={() => inputRef.current?.click()} disabled={stage === "reading"}>
          {stage === "reading" ? `Reading… ${progress}%` : "Choose export.xml"}
        </button>
        {stage === "parsed" && result && (
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleImport}>
            Import into Longevity Compass
          </button>
        )}
      </div>

      {stage === "reading" && (
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{
          height: 6, borderRadius: 999, background: "var(--line)", overflow: "hidden", marginTop: "0.4em",
        }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "var(--signal)", transition: "width 0.2s ease" }} />
        </div>
      )}

      {stage === "parsed" && result && (
        <p className={styles.sectionSub} style={{ margin: 0 }}>
          Found {result.sleepNights.length} night{result.sleepNights.length === 1 ? "" : "s"} of sleep,{" "}
          {result.workouts.length} workout{result.workouts.length === 1 ? "" : "s"}
          {result.workouts.some((w) => w.energyKcal != null)
            ? ` (${result.workouts.filter((w) => w.energyKcal != null).length} with Apple's own calorie-burn and distance data)`
            : ""}
          , and {result.restingHeartRates.length} day{result.restingHeartRates.length === 1 ? "" : "s"} of resting
          heart rate, across {result.recordsScanned.toLocaleString()} records scanned. Importing fills in dates you
          haven&apos;t logged by hand — it never overwrites a manual entry.
        </p>
      )}

      {stage === "done" && merged && (
        <p className={styles.exportedNote}>
          Added {merged.sleepAdded} new night{merged.sleepAdded === 1 ? "" : "s"} and {merged.workoutsAdded} new
          workout{merged.workoutsAdded === 1 ? "" : "s"}. Reloading…
        </p>
      )}

      {stage === "error" && error && (
        <p className={styles.sectionSub} role="alert" style={{ color: "var(--caution)", margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}
