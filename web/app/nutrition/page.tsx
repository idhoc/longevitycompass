"use client";

import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { NutritionPanel } from "@/components/panels/NutritionPanel";
import { MacroRings } from "@/components/MacroRings";
import { GeneticInsightCard } from "@/components/GeneticInsightCard";
import { Gauge } from "@/components/Gauge";
import { FastingTimer } from "@/components/FastingTimer";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { macroTargetsFromProfile } from "@/lib/nutritionTargets";
import { dateKeyOffset } from "@/lib/domainReach";
import type { UserProfile } from "@/lib/profile";
import styles from "./page.module.css";

interface LoggedMeal {
  date: string;
  loggedAt?: string;
  totalCalories: number | null;
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
  const kcalTarget = targets.proteinG * 4 + targets.carbsG * 4 + targets.fatG * 9;
  const kcalToday = todaysMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyOffset(6 - i);
    const dayMeals = meals.filter((m) => m.date === date);
    return { date, kcal: dayMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0) };
  });
  const maxDayKcal = Math.max(kcalTarget, ...last7.map((d) => d.kcal), 1);
  const lastMealAt = meals
    .map((m) => m.loggedAt)
    .filter((v): v is string => !!v)
    .sort()
    .pop() ?? null;

  return (
    <div className={styles.page}>
      <SiteNav />
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/home" className={styles.backLink}>← Home</Link>
          <span className="eyebrow" style={{ color: "var(--nutrition)" }}>Nutrition · Fuel &amp; Metabolism</span>
          <h1>Your meals today</h1>
          <p className={styles.headerSub}>
            Photograph each meal instead of describing it, or photograph what&apos;s in your fridge
            for a recipe built around it.
          </p>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.calorieCard}>
          <Gauge
            size={190}
            value={Math.min(100, (kcalToday / kcalTarget) * 100)}
            valueText={`${Math.round(kcalToday)}`}
            label={`of ${Math.round(kcalTarget)} kcal`}
            color="var(--nutrition)"
            needle={false}
          />
          <div className={styles.weekBars} role="img" aria-label={`Calories logged over the last 7 days: ${last7.map((d) => Math.round(d.kcal)).join(", ")}`}>
            {last7.map((d) => (
              <div key={d.date} className={styles.weekBarCol}>
                <div className={styles.weekBarTrack}>
                  <div
                    className={styles.weekBarFill}
                    style={{ height: `${Math.max(3, (d.kcal / maxDayKcal) * 100)}%` }}
                  />
                </div>
                <span className={styles.weekBarLabel}>
                  {new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <FastingTimer lastMealAt={lastMealAt} />

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
