"use client";

import { useRef, useState } from "react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { parseTwentyThreeAndMe, GENETICS_STORAGE_KEY, type GeneticProfile } from "@/lib/genetics23andme";
import styles from "@/app/settings/page.module.css";

export function GeneticsImport() {
  const [profile, setProfile] = useLocalStorageState<GeneticProfile | null>(GENETICS_STORAGE_KEY, null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseTwentyThreeAndMe(file);
      setProfile(parsed);
    } catch {
      setError("Couldn't read that file — make sure it's the unzipped .txt raw data export from 23andMe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>23andMe raw data (optional)</span>
      <p className={styles.sectionSub} style={{ margin: 0 }}>
        Entirely optional, and only ever parsed on this device. This reads exactly five
        well-studied, non-medical variants — lactase persistence, caffeine metabolism, MTHFR
        folate metabolism, the ACTN3 &quot;sprint gene,&quot; and one FTO appetite-association
        variant. It never reads APOE or any disease-diagnostic marker, and it is not a genetic
        test or medical diagnosis — population-level associations, not a verdict on you.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        className="srOnly"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div style={{ display: "flex", gap: "0.6em", flexWrap: "wrap" }}>
        <button type="button" className={styles.btn} onClick={() => inputRef.current?.click()} disabled={loading}>
          {loading ? "Reading…" : profile ? "Replace file" : "Choose 23andMe .txt file"}
        </button>
        {profile && (
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setProfile(null)}>
            Remove imported data
          </button>
        )}
      </div>

      {error && (
        <p className={styles.sectionSub} role="alert" style={{ color: "var(--caution)", margin: 0 }}>
          {error}
        </p>
      )}

      {profile && (
        <div style={{ marginTop: "0.4em" }}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
          >
            {expanded ? "Hide" : "Show"} what was found
          </button>
          {expanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.7em", marginTop: "0.7em" }}>
              {profile.findings.map((f) => (
                <div key={f.rsid} style={{ borderTop: "1px solid var(--line)", paddingTop: "0.6em" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-sm)" }}>
                    {f.trait} <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>({f.gene})</span>
                  </div>
                  <p className={styles.sectionSub} style={{ margin: "0.2em 0 0" }}>
                    {f.genotype ? `Genotype ${f.genotype} — ` : ""}
                    <strong>{f.label}.</strong> {f.detail}
                  </p>
                  <p className={styles.sectionSub} style={{ margin: "0.2em 0 0", fontSize: "var(--text-xs)" }}>
                    Source: {f.source}
                  </p>
                </div>
              ))}
              <p className={styles.sectionSub} style={{ margin: 0 }}>
                Imported {new Date(profile.importedAt).toLocaleDateString()}. These surface as
                context in Nutrition and Fitness — never as instructions, and never in place of
                real medical or genetic-counseling advice.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
