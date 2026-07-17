"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import type { UserProfile } from "@/lib/profile";
import styles from "./page.module.css";

export default function RootGate() {
  const router = useRouter();
  const [profile, , profileHydrated] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [skipped, , skippedHydrated] = useLocalStorageState<boolean>("lc_onboarding_skipped_v1", false);

  useEffect(() => {
    if (!profileHydrated || !skippedHydrated) return;
    if (!profile?.completedAt && !skipped) {
      router.replace("/onboarding");
    } else {
      router.replace("/home");
    }
  }, [profileHydrated, skippedHydrated, profile, skipped, router]);

  return (
    <div className={styles.splash}>
      <span className={styles.mark}>
        LC<span className={styles.markDot}>·</span>01
      </span>
    </div>
  );
}
