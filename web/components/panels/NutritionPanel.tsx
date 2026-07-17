"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { MEAL_IDEAS, type MealIdea } from "@/lib/mealIdeas";
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

function IdeaRecipeCard({ idea }: { idea: MealIdea }) {
  return (
    <div className={styles.recipeCard}>
      <p className={styles.insightHeadline} style={{ margin: 0 }}>
        {idea.title}
      </p>
      <div className={styles.recipeMetaRow}>
        <span className={styles.recipePill}>{idea.tag}</span>
        <span className={styles.recipePill}>{idea.kcal} kcal</span>
        <span className={styles.recipePill}>{idea.proteinG}g protein</span>
      </div>
      <p className={styles.insightExplanation}>{idea.description}</p>
      <div className={styles.ingredientCols}>
        <div>
          <span className={styles.fieldLabel}>Ingredients</span>
          <ul className={styles.ingredientList} style={{ marginTop: "0.4em" }}>
            {idea.ingredients.map((ing) => (
              <li key={ing} className={styles.ingredientItem}>
                <span className={styles.ingredientDot} style={{ background: "var(--nutrition)" }} />
                {ing}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ol className={styles.stepList}>
        {idea.steps.map((step, i) => (
          <li key={i} className={styles.stepItem}>
            <span className={styles.stepNum}>{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function NutritionPanel() {
  const [mode, setMode] = useState<Mode>("log");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get("topic") === "recipe") setMode("recipe");
  }, []);

  const [meals, setMeals] = useLocalStorageState<LoggedMeal[]>("lc_meals_v1", []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [recipes, setRecipes] = useLocalStorageState<RecipeSuggestion[]>("lc_recipes_v1", []);
  const [recipeUploading, setRecipeUploading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const recipeInputRef = useRef<HTMLInputElement>(null);

  const [openIdeaId, setOpenIdeaId] = useState<string | null>(null);
  const [justLoggedId, setJustLoggedId] = useState<string | null>(null);

  const todaysMeals = meals.filter((m) => m.date === todayKey());
  const totalCalories = todaysMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const totalProtein = todaysMeals.reduce((sum, m) => sum + (m.proteinG || 0), 0);
  const latestRecipe = recipes[recipes.length - 1];
  const openIdea = MEAL_IDEAS.find((i) => i.id === openIdeaId) ?? null;

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

  function logIdea(idea: MealIdea) {
    const entry: LoggedMeal = {
      id: `${Date.now()}`,
      date: todayKey(),
      thumbnail: "",
      foods: [{ name: idea.title, estimated_grams: null, estimated_calories: idea.kcal }],
      totalCalories: idea.kcal,
      proteinG: idea.proteinG,
      carbsG: idea.carbsG,
      fatG: idea.fatG,
      suggestion: idea.description,
      confidence: "moderate",
    };
    setMeals((prev) => [...prev, entry]);
    setJustLoggedId(idea.id);
    setTimeout(() => setJustLoggedId(null), 2000);
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
              <div className={styles.mealGrid}>
                {todaysMeals.map((m) => (
                  <div key={m.id} className={styles.mealCard}>
                    {m.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.thumbnail}
                        alt={m.foods.map((f) => f.name).join(", ") || "Logged meal photo"}
                        className={styles.mealThumb}
                      />
                    ) : (
                      <div className={styles.mealThumbIcon} aria-hidden="true">
                        🍽️
                      </div>
                    )}
                    <span className={styles.mealCardName}>{m.foods.map((f) => f.name).join(", ") || "Meal"}</span>
                    {m.totalCalories != null && <span className={styles.mealCardKcal}>{Math.round(m.totalCalories)} kcal</span>}
                  </div>
                ))}
              </div>
            )}

            <div>
              <span className={styles.fieldLabel}>Meal ideas — tap for the recipe</span>
              <div className={styles.ideaStrip} style={{ marginTop: "0.5em" }}>
                {MEAL_IDEAS.map((idea) => (
                  <button
                    key={idea.id}
                    type="button"
                    className={openIdeaId === idea.id ? `${styles.ideaCard} ${styles.ideaCardActive}` : styles.ideaCard}
                    onClick={() => setOpenIdeaId((cur) => (cur === idea.id ? null : idea.id))}
                    aria-expanded={openIdeaId === idea.id}
                  >
                    <span className={styles.ideaTag}>{idea.tag}</span>
                    <div className={styles.ideaTitle}>{idea.title}</div>
                    <div className={styles.ideaMacros}>
                      {idea.kcal} kcal · {idea.proteinG}g protein
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {openIdea && (
              <div>
                <IdeaRecipeCard idea={openIdea} />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  style={{ marginTop: "0.6em" }}
                  onClick={() => logIdea(openIdea)}
                >
                  {justLoggedId === openIdea.id ? "Logged ✓" : `Log this — ${openIdea.kcal} kcal`}
                </button>
              </div>
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
              <div className={styles.recipeCard}>
                <p className={styles.insightHeadline} style={{ margin: 0 }}>
                  {latestRecipe.title}
                </p>
                <div className={styles.recipeMetaRow}>
                  {latestRecipe.estimatedMinutes && <span className={styles.recipePill}>{latestRecipe.estimatedMinutes} min</span>}
                  {latestRecipe.servings && <span className={styles.recipePill}>{latestRecipe.servings} servings</span>}
                </div>
                <div className={styles.ingredientCols}>
                  <div>
                    <span className={styles.fieldLabel}>You have</span>
                    <ul className={styles.ingredientList} style={{ marginTop: "0.4em" }}>
                      {latestRecipe.usesIngredients.map((ing) => (
                        <li key={ing} className={styles.ingredientItem}>
                          <span className={styles.ingredientDot} style={{ background: "var(--nutrition)" }} />
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {latestRecipe.missingCommonItems.length > 0 && (
                    <div>
                      <span className={styles.fieldLabel}>You&apos;ll need</span>
                      <ul className={styles.ingredientList} style={{ marginTop: "0.4em" }}>
                        {latestRecipe.missingCommonItems.map((ing) => (
                          <li key={ing} className={styles.ingredientItem}>
                            <span className={styles.ingredientDot} style={{ background: "var(--ink-faint)" }} />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {latestRecipe.steps.length > 0 && (
                  <ol className={styles.stepList}>
                    {latestRecipe.steps.map((step, i) => (
                      <li key={i} className={styles.stepItem}>
                        <span className={styles.stepNum}>{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ) : (
              <p className={styles.emptyText}>
                Photograph what&apos;s in your fridge or pantry and get a real recipe built
                around it — or browse a recipe idea below.
              </p>
            )}

            <div>
              <span className={styles.fieldLabel}>Recipe ideas — tap for the full recipe</span>
              <div className={styles.ideaStrip} style={{ marginTop: "0.5em" }}>
                {MEAL_IDEAS.map((idea) => (
                  <button
                    key={idea.id}
                    type="button"
                    className={openIdeaId === idea.id ? `${styles.ideaCard} ${styles.ideaCardActive}` : styles.ideaCard}
                    onClick={() => setOpenIdeaId((cur) => (cur === idea.id ? null : idea.id))}
                    aria-expanded={openIdeaId === idea.id}
                  >
                    <span className={styles.ideaTag}>{idea.tag}</span>
                    <div className={styles.ideaTitle}>{idea.title}</div>
                    <div className={styles.ideaMacros}>{idea.ingredients.length} ingredients</div>
                  </button>
                ))}
              </div>
            </div>

            {openIdea && <IdeaRecipeCard idea={openIdea} />}

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
