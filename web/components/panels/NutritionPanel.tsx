"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Utensils, ChevronDown } from "lucide-react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { MEAL_IDEAS, type MealIdea } from "@/lib/mealIdeas";
import { dateKeyOffset } from "@/lib/domainReach";
import type { UserProfile } from "@/lib/profile";
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

/** Recalculates the plate total from whatever foods are actually still
 * on the card — so removing a misidentified item, or correcting its
 * portion, changes the number instead of leaving a stale total behind. */
function sumCalories(foods: MealFood[]): number | null {
  const known = foods.filter((f) => f.estimated_calories != null);
  if (!known.length) return null;
  return known.reduce((sum, f) => sum + (f.estimated_calories ?? 0), 0);
}

/** Reorders (never hides) meal ideas so whatever actually fits the
 * profile's real dietary restrictions surfaces first — the same idea
 * list for everyone otherwise reads as static and untailored. */
function sortIdeasForProfile(ideas: MealIdea[], profile: UserProfile | null): MealIdea[] {
  const restrictions = profile?.dietaryRestrictions.filter((r) => r !== "No restrictions") ?? [];
  if (!restrictions.length) return ideas;
  return [...ideas].sort((a, b) => {
    const aFit = restrictions.filter((r) => a.dietTags.includes(r as MealIdea["dietTags"][number])).length;
    const bFit = restrictions.filter((r) => b.dietTags.includes(r as MealIdea["dietTags"][number])).length;
    return bFit - aFit;
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

const CONFIDENCE_LABEL: Record<LoggedMeal["confidence"], string> = {
  low: "Low confidence — a rough visual estimate",
  moderate: "Moderate confidence — a clear, well-lit photo",
};

/** A logged meal, made interactive: tap to expand the actual per-food
 * breakdown the AI produced (never shown before), correct a portion or
 * remove a misidentified item with the total recalculating live, and
 * read the AI's actual suggestion instead of just a number. */
function MealCard({
  meal,
  expanded,
  onToggle,
  onUpdateGrams,
  onRemoveFood,
  onRemoveMeal,
}: {
  meal: LoggedMeal;
  expanded: boolean;
  onToggle: () => void;
  onUpdateGrams: (foodIndex: number, grams: number) => void;
  onRemoveFood: (foodIndex: number) => void;
  onRemoveMeal: () => void;
}) {
  return (
    <div className={styles.mealCard}>
      <button type="button" onClick={onToggle} className={styles.mealCardHead} aria-expanded={expanded}>
        {meal.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meal.thumbnail}
            alt={meal.foods.map((f) => f.name).join(", ") || "Logged meal photo"}
            className={styles.mealThumb}
          />
        ) : (
          <div className={styles.mealThumbIcon} aria-hidden="true">
            <Utensils size={22} />
          </div>
        )}
        <div className={styles.mealCardBody}>
          <span className={styles.mealCardName}>{meal.foods.map((f) => f.name).join(", ") || "Meal"}</span>
          {meal.proteinG != null && <span className={styles.mealMacroPill}>{Math.round(meal.proteinG)}g protein</span>}
        </div>
        <div className={styles.mealCardRight}>
          {meal.totalCalories != null && <span className={styles.mealCardKcal}>{Math.round(meal.totalCalories)}</span>}
          <span className={styles.mealCardKcalUnit}>kcal</span>
          <ChevronDown size={16} className={styles.mealChevron} style={{ transform: expanded ? "rotate(180deg)" : undefined }} />
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 0.8em 0.8em", borderTop: "1px solid var(--line)", paddingTop: "0.7em", display: "flex", flexDirection: "column", gap: "0.5em" }}>
          <ul className={styles.ingredientList}>
            {meal.foods.map((food, i) => (
              <li key={i} className={styles.ingredientItem} style={{ alignItems: "center", gap: "0.5em" }}>
                <span className={styles.ingredientDot} style={{ background: "var(--nutrition)" }} />
                <span style={{ flex: 1 }}>{food.name}</span>
                <input
                  type="number"
                  className={styles.input}
                  style={{ width: 64, padding: "0.3em 0.5em" }}
                  value={food.estimated_grams ?? ""}
                  onChange={(e) => onUpdateGrams(i, Number(e.target.value))}
                  aria-label={`${food.name} grams`}
                />
                <span className={`${styles.panelMeta} tabular`}>g</span>
                <span className={`${styles.panelMeta} tabular`} style={{ minWidth: "4.5ch", textAlign: "right" }}>
                  {food.estimated_calories != null ? `${Math.round(food.estimated_calories)} kcal` : "—"}
                </span>
                <button
                  type="button"
                  className={styles.btn}
                  style={{ padding: "0.3em 0.6em", minHeight: "auto" }}
                  onClick={() => onRemoveFood(i)}
                  aria-label={`Remove ${food.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {meal.suggestion && <p className={styles.insightExplanation}>{meal.suggestion}</p>}
          <div className={styles.panelFooter}>
            <span className={styles.panelMeta}>{CONFIDENCE_LABEL[meal.confidence]}</span>
            <button type="button" className={styles.btn} onClick={onRemoveMeal}>
              Delete meal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function NutritionPanel() {
  const [mode, setMode] = useState<Mode>("log");
  const [profile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);

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
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  const todaysMeals = meals.filter((m) => m.date === todayKey());
  const totalCalories = todaysMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const totalProtein = todaysMeals.reduce((sum, m) => sum + (m.proteinG || 0), 0);
  const recentMeals = useMemo(() => {
    const cutoffDates = new Set(Array.from({ length: 6 }, (_, i) => dateKeyOffset(i + 1)));
    return meals.filter((m) => cutoffDates.has(m.date)).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [meals]);
  const recentRecipes = useMemo(() => [...recipes].reverse().slice(0, 5), [recipes]);
  const sortedIdeas = useMemo(() => sortIdeasForProfile(MEAL_IDEAS, profile), [profile]);
  const openIdea = MEAL_IDEAS.find((i) => i.id === openIdeaId) ?? null;
  const expandedRecipe = recentRecipes.find((r) => r.id === expandedRecipeId) ?? recentRecipes[0] ?? null;

  function updateFoodGrams(mealId: string, foodIndex: number, grams: number) {
    setMeals((prev) =>
      prev.map((m) => {
        if (m.id !== mealId) return m;
        const foods = m.foods.map((f, i) => {
          if (i !== foodIndex) return f;
          const oldGrams = f.estimated_grams;
          const oldCalories = f.estimated_calories;
          const scaledCalories =
            oldGrams && oldGrams > 0 && oldCalories != null ? Math.round((oldCalories / oldGrams) * grams) : oldCalories;
          return { ...f, estimated_grams: grams, estimated_calories: scaledCalories };
        });
        return { ...m, foods, totalCalories: sumCalories(foods) };
      })
    );
  }

  function removeFood(mealId: string, foodIndex: number) {
    setMeals((prev) =>
      prev.map((m) => {
        if (m.id !== mealId) return m;
        const foods = m.foods.filter((_, i) => i !== foodIndex);
        return { ...m, foods, totalCalories: sumCalories(foods) };
      })
    );
  }

  function removeMeal(mealId: string) {
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
    setExpandedMealId(null);
  }

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
                  <MealCard
                    key={m.id}
                    meal={m}
                    expanded={expandedMealId === m.id}
                    onToggle={() => setExpandedMealId((cur) => (cur === m.id ? null : m.id))}
                    onUpdateGrams={(foodIndex, grams) => updateFoodGrams(m.id, foodIndex, grams)}
                    onRemoveFood={(foodIndex) => removeFood(m.id, foodIndex)}
                    onRemoveMeal={() => removeMeal(m.id)}
                  />
                ))}
              </div>
            )}

            {recentMeals.length > 0 && (
              <div>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => setShowHistory((s) => !s)}
                  aria-expanded={showHistory}
                >
                  {showHistory ? "Hide" : "Show"} last 6 days ({recentMeals.length} meal{recentMeals.length === 1 ? "" : "s"})
                </button>
                {showHistory && (
                  <div className={styles.mealGrid} style={{ marginTop: "0.6em" }}>
                    {recentMeals.map((m) => (
                      <MealCard
                        key={m.id}
                        meal={m}
                        expanded={expandedMealId === m.id}
                        onToggle={() => setExpandedMealId((cur) => (cur === m.id ? null : m.id))}
                        onUpdateGrams={(foodIndex, grams) => updateFoodGrams(m.id, foodIndex, grams)}
                        onRemoveFood={(foodIndex) => removeFood(m.id, foodIndex)}
                        onRemoveMeal={() => removeMeal(m.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <span className={styles.fieldLabel}>Meal ideas — tap for the recipe</span>
              <div className={styles.ideaStrip} style={{ marginTop: "0.5em" }}>
                {sortedIdeas.map((idea) => (
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
            {recentRecipes.length > 1 && (
              <div>
                <span className={styles.fieldLabel}>Recent recipes from your photos</span>
                <div className={styles.tagRow} style={{ marginTop: "0.4em" }}>
                  {recentRecipes.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={expandedRecipe?.id === r.id ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                      onClick={() => setExpandedRecipeId(r.id)}
                      aria-pressed={expandedRecipe?.id === r.id}
                    >
                      {r.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {expandedRecipe ? (
              <div className={styles.recipeCard}>
                <p className={styles.insightHeadline} style={{ margin: 0 }}>
                  {expandedRecipe.title}
                </p>
                <div className={styles.recipeMetaRow}>
                  {expandedRecipe.estimatedMinutes && <span className={styles.recipePill}>{expandedRecipe.estimatedMinutes} min</span>}
                  {expandedRecipe.servings && <span className={styles.recipePill}>{expandedRecipe.servings} servings</span>}
                </div>
                <div className={styles.ingredientCols}>
                  <div>
                    <span className={styles.fieldLabel}>You have</span>
                    <ul className={styles.ingredientList} style={{ marginTop: "0.4em" }}>
                      {expandedRecipe.usesIngredients.map((ing) => (
                        <li key={ing} className={styles.ingredientItem}>
                          <span className={styles.ingredientDot} style={{ background: "var(--nutrition)" }} />
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {expandedRecipe.missingCommonItems.length > 0 && (
                    <div>
                      <span className={styles.fieldLabel}>You&apos;ll need</span>
                      <ul className={styles.ingredientList} style={{ marginTop: "0.4em" }}>
                        {expandedRecipe.missingCommonItems.map((ing) => (
                          <li key={ing} className={styles.ingredientItem}>
                            <span className={styles.ingredientDot} style={{ background: "var(--ink-faint)" }} />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {expandedRecipe.steps.length > 0 && (
                  <ol className={styles.stepList}>
                    {expandedRecipe.steps.map((step, i) => (
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
                {sortedIdeas.map((idea) => (
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
