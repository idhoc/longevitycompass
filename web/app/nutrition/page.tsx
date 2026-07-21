"use client";

import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { NutritionPanel } from "@/components/panels/NutritionPanel";
import { MacroRings } from "@/components/MacroRings";
import { GeneticInsightCard } from "@/components/GeneticInsightCard";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { macroTargetsFromProfile } from "@/lib/nutritionTargets";
import type { UserProfile } from "@/lib/profile";
import styles from "./page.module.css";

interface LoggedMeal {
  date: string;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function NutritionPage() {
  const [meals] = useLocalStorageState<LoggedMeal[]>("lc_meals_v1", []);
  const [profile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const todaysMeals = meals.filter((m) => m.date === todayKey());
  const proteinG = todaysMeals.reduce((sum, m) => sum + (m.proteinG || 0), 0);
  const carbsG = todaysMeals.reduce((sum, m) => sum + (m.carbsG || 0), 0);
  const fatG = todaysMeals.reduce((sum, m) => sum + (m.fatG || 0), 0);
  const targets = macroTargetsFromProfile(profile);

  return (
    <div className={styles.page}>
      <SiteNav />
      <div className={styles.header}>
        <Link href="/home" className={styles.backLink}>← Home</Link>
        <span className="eyebrow" style={{ color: "var(--nutrition)" }}>Nutrition</span>
        <h1>Your meals today</h1>
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
              proteinTarget={targets.proteinG}
              carbsTarget={targets.carbsG}
              fatTarget={targets.fatG}
            />
            <p className={styles.macroNote}>
              {targets.personalized
                ? "Targets from your age, sex, height, and weight (Mifflin-St Jeor), not a lab measurement of your actual metabolism."
                : "General adult targets — add your age, sex, height, and weight in Settings to personalize these."}
            </p>
          </div>
        )}
        <NutritionPanel />
        <GeneticInsightCard rsids={["rs4988235", "rs762551", "rs1801133"]} color="var(--nutrition)" />
      </div>
    </div>
  );
}
