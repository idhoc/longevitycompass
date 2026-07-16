"use client";

import { useRef, useState } from "react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import styles from "./panels.module.css";

interface MealFood {
  name: string;
  estimated_grams: number | null;
  estimated_calories: number | null;
}

interface LoggedMeal {
  id: string;
  date: string;
  thumbnail: string;
  foods: MealFood[];
  totalCalories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  suggestion: string;
  confidence: "low" | "moderate";
}

interface RecipeSuggestion {
  id: string;
  date: string;
  thumbnail: string;
  title: string;
  usesIngredients: string[];
  missingCommonItems: string[];
  steps: string[];
  estimatedMinutes: number | null;
  servings: number | null;
  confidence: "low" | "moderate";
}

type Mode = "log" | "recipe";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function NutritionPanel() {
  const [mode, setMode] = useState<Mode>("log");

  const [meals, setMeals] = useLocalStorageState<LoggedMeal[]>("lc_meals_v1", []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [recipes, setRecipes] = useLocalStorageState<RecipeSuggestion[]>("lc_recipes_v1", []);
  const [recipeUploading, setRecipeUploading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const recipeInputRef = useRef<HTMLInputElement>(null);

  const todaysMeals = meals.filter((m) => m.date === todayKey());
  const totalCalories = todaysMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const totalProtein = todaysMeals.reduce((sum, m) => sum + (m.proteinG || 0), 0);
  const latest = todaysMeals[todaysMeals.length - 1];
  const latestRecipe = recipes[recipes.length - 1];

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Photo analysis failed");
      const meal = data.meal;
      const entry: LoggedMeal = {
        id: `${Date.now()}`,
        date: todayKey(),
        thumbnail: dataUrl,
        foods: meal.foods || [],
        totalCalories: meal.total_calories_estimate,
        proteinG: meal.protein_g,
        carbsG: meal.carbs_g,
        fatG: meal.fat_g,
        suggestion: meal.suggestion,
        confidence: meal.confidence,
      };
      setMeals((prev) => [...prev, entry]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that photo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRecipeFile(file: File) {
    setRecipeUploading(true);
    setRecipeError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/recipe-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ingredient analysis failed");
      const recipe = data.recipe;
      const entry: RecipeSuggestion = {
        id: `${Date.now()}`,
        date: todayKey(),
        thumbnail: dataUrl,
        title: recipe.title,
        usesIngredients: recipe.usesIngredients || [],
        missingCommonItems: recipe.missingCommonItems || [],
        steps: recipe.steps || [],
        estimatedMinutes: recipe.estimatedMinutes,
        servings: recipe.servings,
        confidence: recipe.confidence,
      };
      setRecipes((prev) => [...prev, entry]);
    } catch (err) {
      setRecipeError(err instanceof Error ? err.message : "Couldn't read that photo.");
    } finally {
      setRecipeUploading(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="nutrition-panel-title">
      <div className={styles.panelHead}>
        <div>
          <span className={styles.panelLabel}>Nutrition</span>
          <h3 className={styles.panelTitle} id="nutrition-panel-title">
            {todaysMeals.length ? `${Math.round(totalCalories)} kcal today` : "Nothing logged today"}
          </h3>
        </div>
        {todaysMeals.length > 0 && (
          <span className={`${styles.panelMeta} tabular`}>{Math.round(totalProtein)}g protein</span>
        )}
      </div>

      <div className={styles.panelBody}>
        <div className={styles.tagRow} role="group" aria-label="Nutrition mode">
          <button
            type="button"
            className={mode === "log" ? `${styles.tag} ${styles.tagActive}` : styles.tag}
            onClick={() => setMode("log")}
            aria-pressed={mode === "log"}
          >
            Log a meal
          </button>
          <button
            type="button"
            className={mode === "recipe" ? `${styles.tag} ${styles.tagActive}` : styles.tag}
            onClick={() => setMode("recipe")}
            aria-pressed={mode === "recipe"}
          >
            What can I make?
          </button>
        </div>

        {mode === "log" ? (
          <>
            {todaysMeals.length > 0 && (
              <div style={{ display: "flex", gap: "0.5em", flexWrap: "wrap" }}>
                {todaysMeals.map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.id}
                    src={m.thumbnail}
                    alt={m.foods.map((f) => f.name).join(", ") || "Logged meal photo"}
                    width={56}
                    height={56}
                    style={{ borderRadius: 8, objectFit: "cover", border: "1px solid var(--line-strong)" }}
                  />
                ))}
              </div>
            )}

            {latest ? (
              <div>
                <p className={styles.emptyText} style={{ margin: 0 }}>
                  Last photo: {latest.foods.map((f) => f.name).join(", ") || "—"}
                </p>
                <p className={styles.insightExplanation} style={{ marginTop: "0.4em" }}>
                  {latest.suggestion}
                </p>
              </div>
            ) : (
              <p className={styles.emptyText}>
                Photograph each meal instead of describing it — the plan reacts to what you
                actually ate, not what you remember eating.
              </p>
            )}

            {error && (
              <p className={styles.emptyText} role="alert">
                {error}
              </p>
            )}

            <div className={styles.panelFooter}>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Analyzing…" : "Add a meal photo"}
              </button>
            </div>
          </>
        ) : (
          <>
            {latestRecipe ? (
              <div>
                <p className={styles.insightHeadline} style={{ margin: 0 }}>{latestRecipe.title}</p>
                <p className={styles.emptyText} style={{ marginTop: "0.4em" }}>
                  Uses: {latestRecipe.usesIngredients.join(", ") || "—"}
                  {latestRecipe.missingCommonItems.length > 0 && (
                    <> · Also needs: {latestRecipe.missingCommonItems.join(", ")}</>
                  )}
                </p>
                {(latestRecipe.estimatedMinutes || latestRecipe.servings) && (
                  <p className={`${styles.panelMeta} tabular`} style={{ marginTop: "0.4em" }}>
                    {latestRecipe.estimatedMinutes ? `${latestRecipe.estimatedMinutes} min` : ""}
                    {latestRecipe.estimatedMinutes && latestRecipe.servings ? " · " : ""}
                    {latestRecipe.servings ? `${latestRecipe.servings} servings` : ""}
                  </p>
                )}
                {latestRecipe.steps.length > 0 && (
                  <ol style={{ marginTop: "0.6em", paddingLeft: "1.2em", display: "flex", flexDirection: "column", gap: "0.35em" }}>
                    {latestRecipe.steps.map((step, i) => (
                      <li key={i} className={styles.emptyText} style={{ maxWidth: "none" }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ) : (
              <p className={styles.emptyText}>
                Photograph what&apos;s in your fridge or pantry and get a real recipe built
                around it — instead of a plan that assumes ingredients you don&apos;t have.
              </p>
            )}

            {recipeError && (
              <p className={styles.emptyText} role="alert">
                {recipeError}
              </p>
            )}

            <div className={styles.panelFooter}>
              <input
                ref={recipeInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleRecipeFile(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => recipeInputRef.current?.click()}
                disabled={recipeUploading}
              >
                {recipeUploading ? "Finding a recipe…" : "Add an ingredient photo"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
