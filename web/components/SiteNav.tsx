"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { t } from "@/lib/i18n";
import type { UserProfile } from "@/lib/profile";
import styles from "./SiteNav.module.css";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/topics", label: "Topics" },
  { href: "/recovery", label: "Recovery" },
  { href: "/nutrition", label: "Nutrition" },
  { href: "/fitness", label: "Fitness" },
  { href: "/mind", label: "Mind" },
  { href: "/coach", label: "Coach" },
  { href: "/settings", label: "Settings" },
];

/** Highlights whichever page is actually open, derived from the real
 * route — not a prop the caller has to remember to pass correctly (it
 * didn't get passed correctly, for a long time). */
export function SiteNav() {
  const pathname = usePathname();
  const [profile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const lang = profile?.language;

  return (
    <header className={styles.nav}>
      <Link href="/home" className={styles.mark}>
        LC<span className={styles.markDot}>·</span>01
      </Link>
      <nav className={styles.links}>
        {LINKS.map((l) => {
          const isActive = pathname === l.href || pathname?.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={isActive ? `${styles.link} ${styles.linkActive}` : styles.link}
            >
              {t(lang, l.label)}
              {isActive && (
                <motion.span
                  layoutId="nav-underline"
                  className={styles.underline}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
