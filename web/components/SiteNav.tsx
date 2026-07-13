import Link from "next/link";
import styles from "./SiteNav.module.css";

const LINKS = [
  { href: "/", label: "Trajectory" },
  { href: "/dashboard", label: "Domains" },
  { href: "/coach", label: "Coach" },
];

export function SiteNav({ active }: { active: string }) {
  return (
    <header className={styles.nav}>
      <Link href="/" className={styles.mark}>
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
