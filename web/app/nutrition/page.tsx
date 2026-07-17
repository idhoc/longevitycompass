import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { NutritionPanel } from "@/components/panels/NutritionPanel";
import styles from "./page.module.css";

export default function NutritionPage() {
  return (
    <div className={styles.page}>
      <SiteNav active="/home" />
      <div className={styles.header}>
        <Link href="/home" className={styles.backLink}>← Home</Link>
        <span className="eyebrow">Nutrition</span>
        <h1>What you actually ate</h1>
        <p className={styles.headerSub}>
          Photograph each meal instead of describing it, or photograph what&apos;s in your fridge
          for a recipe built around it.
        </p>
      </div>
      <div className={styles.content}>
        <NutritionPanel />
      </div>
    </div>
  );
}
