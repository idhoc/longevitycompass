import Link from "next/link";
import styles from "./SiteNav.module.css";

// WHOOP's own 5-tab structure: Home, Coach, Journal, Body, and a fifth
// slot for account/settings — Sleep, Nutrition, Fitness, and Mind are
// reached by tapping a dial or card on Home, not listed here directly.
const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/coach", label: "Coach" },
  { href: "/journal", label: "Journal" },
  { href: "/body", label: "Body" },
  { href: "/settings", label: "Settings" },
];

export function SiteNav({ active }: { active: string }) {
  return (
    <header className={styles.nav}>
      <Link href="/home" className={styles.mark}>
        LC<span className={styles.markDot}>·</span>01
      </Link>
      <nav className={styles.links}>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={l.href === active ? `${styles.link} ${styles.linkActive}` : styles.link}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
