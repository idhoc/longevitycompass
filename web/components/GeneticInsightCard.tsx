"use client";

import Link from "next/link";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { GENETICS_STORAGE_KEY, type GeneticProfile } from "@/lib/genetics23andme";
import panelStyles from "@/components/panels/panels.module.css";

interface GeneticInsightCardProps {
  rsids: string[];
  color: string;
}

/** Surfaces only the SNPs relevant to the domain it's dropped into —
 * nothing here appears until the user has actually imported 23andMe
 * data, and it never appears as an instruction, only as context. */
export function GeneticInsightCard({ rsids, color }: GeneticInsightCardProps) {
  const [profile] = useLocalStorageState<GeneticProfile | null>(GENETICS_STORAGE_KEY, null);
  if (!profile) return null;

  const relevant = profile.findings.filter((f) => rsids.includes(f.rsid) && f.genotype);
  if (!relevant.length) return null;

  return (
    <section className={panelStyles.panel} style={{ borderLeft: `3px solid ${color}`, minHeight: 0 }}>
      <div className={panelStyles.panelHead}>
        <span className={panelStyles.panelLabel}>From your genetics</span>
      </div>
      <div className={panelStyles.panelBody}>
        {relevant.map((f) => (
          <div key={f.rsid} className={panelStyles.insight} style={{ borderTop: "none", paddingTop: 0 }}>
            <p className={panelStyles.insightHeadline}>
              {f.trait}: {f.label}
            </p>
            <p className={panelStyles.insightExplanation}>{f.detail}</p>
          </div>
        ))}
        <p className={panelStyles.emptyText} style={{ margin: 0 }}>
          Educational only, from five self-imported variants — not a diagnosis.{" "}
          <Link href="/settings">Manage in Settings</Link>.
        </p>
      </div>
    </section>
  );
}
