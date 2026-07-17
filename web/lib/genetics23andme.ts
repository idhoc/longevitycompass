/**
 * Client-side-only parser + interpreter for a 23andMe raw-data export
 * (the tab-separated rsid/chromosome/position/genotype file). The file is
 * read and parsed entirely in the browser — it is never uploaded, and
 * only five, well-documented, non-diagnostic, lifestyle-relevant SNPs are
 * extracted. APOE and every disease-diagnostic marker (BRCA, Huntington's,
 * etc.) are deliberately out of scope for this feature — that's a genetic
 * counselor's conversation, not a wellness app's.
 *
 * Genotype-to-phenotype directions below are sourced from SNPedia and the
 * primary literature cited alongside each SNP; 23andMe's own raw-data
 * strand orientation matches SNPedia's convention for all five. This is
 * still an educational simplification of population-level associations,
 * not a clinical test — the UI must always say so.
 */

export interface GeneticFinding {
  rsid: string;
  gene: string;
  trait: string;
  genotype: string | null; // null = not present in this file/chip version
  label: string;
  detail: string;
  source: string;
}

function normalize(genotype: string): string {
  return genotype.toUpperCase().split("").sort().join("");
}

interface SnpDefinition {
  rsid: string;
  gene: string;
  trait: string;
  source: string;
  interpret: (normalized: string) => { label: string; detail: string } | null;
}

const SNP_DEFINITIONS: SnpDefinition[] = [
  {
    rsid: "rs4988235",
    gene: "MCM6 / LCT",
    trait: "Lactase persistence",
    source: "SNPedia rs4988235",
    interpret: (g) => {
      if (g === "AA" || g === "AG") return { label: "Likely lactase persistent", detail: "Can typically keep digesting lactose into adulthood — one A copy is usually enough." };
      if (g === "GG") return { label: "Likely lactase non-persistent", detail: "Lactase production typically drops off after childhood — dairy may be more likely to cause discomfort." };
      return null;
    },
  },
  {
    rsid: "rs762551",
    gene: "CYP1A2",
    trait: "Caffeine metabolism speed",
    source: "SNPedia rs762551 / Cornelis et al.",
    interpret: (g) => {
      if (g === "AA") return { label: "Fast metabolizer", detail: "Clears caffeine relatively quickly — often needs more of it, and later cups are less likely to disrupt sleep." };
      if (g === "AC") return { label: "Intermediate metabolizer", detail: "A mixed profile — moderate sensitivity to caffeine's effects and timing." };
      if (g === "CC") return { label: "Slow metabolizer", detail: "Clears caffeine more slowly — afternoon caffeine is more likely to affect sleep, and intake is worth watching." };
      return null;
    },
  },
  {
    rsid: "rs1801133",
    gene: "MTHFR",
    trait: "Folate metabolism (C677T)",
    source: "SNPedia rs1801133",
    interpret: (g) => {
      if (g === "GG") return { label: "Typical MTHFR activity", detail: "The most common genotype — typical enzyme activity for folate metabolism." };
      if (g === "AG") return { label: "Reduced MTHFR activity (~65%)", detail: "One copy of the reduced-activity variant — folate-rich foods are a reasonable, low-risk thing to prioritize." };
      if (g === "AA") return { label: "Significantly reduced MTHFR activity (~30%)", detail: "Two copies of the reduced-activity variant — worth a real conversation with a clinician about folate/B-vitamin status, not something to self-manage from this alone." };
      return null;
    },
  },
  {
    rsid: "rs1815739",
    gene: "ACTN3",
    trait: "Muscle fiber type (\"sprint gene\")",
    source: "SNPedia rs1815739 / Yang et al.",
    interpret: (g) => {
      if (g === "CC") return { label: "Power/sprint-leaning (RR)", detail: "Produces alpha-actinin-3 — a genotype overrepresented among power and sprint athletes. Doesn't rule out endurance work, just a lean." };
      if (g === "CT") return { label: "Mixed profile (RX)", detail: "One functional copy — a genotype that shows up across both power and endurance athletes." };
      if (g === "TT") return { label: "Endurance-leaning, ACTN3-deficient (XX)", detail: "About 1 in 5 people worldwide share this genotype, with no known health downside — some data links it to an endurance-training lean." };
      return null;
    },
  },
  {
    rsid: "rs9939609",
    gene: "FTO",
    trait: "Appetite-regulation association",
    source: "SNPedia rs9939609 / Frayling et al.",
    interpret: (g) => {
      if (g === "TT") return { label: "Typical FTO-related appetite association", detail: "The lower-association genotype for this specific variant — one input among many, not a verdict." };
      if (g === "AT") return { label: "Intermediate FTO-related appetite association", detail: "One copy of the risk-associated allele — population studies link it to a modest appetite/satiety effect, not a fixed outcome." };
      if (g === "AA") return { label: "Higher FTO-related appetite association", detail: "Two copies of the risk-associated allele — population studies link this to a larger appetite and feeling full later, not a determinant of your weight." };
      return null;
    },
  },
];

export interface GeneticProfile {
  importedAt: string;
  findings: GeneticFinding[];
}

export async function parseTwentyThreeAndMe(file: File): Promise<GeneticProfile> {
  const text = await file.text();
  const wanted = new Map(SNP_DEFINITIONS.map((d) => [d.rsid, d]));
  const genotypeByRsid = new Map<string, string>();

  const lines = text.split("\n");
  for (const line of lines) {
    if (!line || line[0] === "#") continue;
    const cols = line.split("\t");
    if (cols.length < 4) continue;
    const rsid = cols[0].trim();
    if (!wanted.has(rsid)) continue;
    const genotype = cols[3].trim();
    if (genotype && genotype !== "--") genotypeByRsid.set(rsid, genotype);
    if (genotypeByRsid.size === wanted.size) break;
  }

  const findings: GeneticFinding[] = SNP_DEFINITIONS.map((def) => {
    const raw = genotypeByRsid.get(def.rsid) ?? null;
    const normalized = raw ? normalize(raw) : null;
    const result = normalized ? def.interpret(normalized) : null;
    return {
      rsid: def.rsid,
      gene: def.gene,
      trait: def.trait,
      genotype: raw,
      label: result?.label ?? "Not present in this file",
      detail: result?.detail ?? "This chip version may not have genotyped this exact position.",
      source: def.source,
    };
  });

  return { importedAt: new Date().toISOString(), findings };
}

export const GENETICS_STORAGE_KEY = "lc_genetics_v1";

export function saveGeneticProfile(profile: GeneticProfile) {
  window.localStorage.setItem(GENETICS_STORAGE_KEY, JSON.stringify(profile));
}
