"use client";

import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { NutritionPanel } from "@/components/panels/NutritionPanel";
import { MacroRings } from "@/components/MacroRings";
import { GeneticInsightCard } from "@/components/GeneticInsightCard";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import styles from "./page.module.css";

interface LoggedMeal {
  date: string;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

const PROTEIN_TARGET = 100;
const CARBS_TARGET = 250;
const FAT_TARGET = 70;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function NutritionPage() {
  const [meals] = useLocalStorageState<LoggedMeal[]>("lc_meals_v1", []);
  const todaysMeals = meals.filter((m) => m.date === todayKey());
  const proteinG = todaysMeals.reduce((sum, m) => sum + (m.proteinG || 0), 0);
  const carbsG = todaysMeals.reduce((sum, m) => sum + (m.carbsG || 0), 0);
  const fatG = todaysMeals.reduce((sum, m) => sum + (m.fatG || 0), 0);

  return (
    <div className={styles.page}>
      <SiteNav active="/home" />
      <div className={styles.header}>
        <Link href="/home" className={styles.backLink}>← Home</Link>
        <span className="eyebrow" style={{ color: "var(--nutrition)" }}>Nutrition</span>
        <h1>What you actually ate</h1>
        <p className={styles.headerSub}>
          Photograph each meal instead of describing it, or photograph what&apos;s in your fridge
          for a recipe built around it.
        </p>
      </div>
      <div className={styles.content}>
        {todaysMeals.length > 0 && (
          <div className={styles.macroCard}>
            <span className={styles.macroLabel}>Today&apos;s macros</span>
            <MacroRings
              proteinG={proteinG}
              carbsG={carbsG}
              fatG={fatG}
              proteinTarget={PROTEIN_TARGET}
              carbsTarget={CARBS_TARGET}
              fatTarget={FAT_TARGET}
            />
            <p className={styles.macroNote}>
              General adult targets, not personalized to your body weight yet.
            </p>
          </div>
        )}
        <NutritionPanel />
        <GeneticInsightCard rsids={["rs4988235", "rs762551", "rs1801133"]} color="var(--nutrition)" />
      </div>
    </div>
  );
}
