import Link from "next/link";
import styles from "./SiteNav.module.css";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/recovery", label: "Recovery" },
  { href: "/nutrition", label: "Nutrition" },
  { href: "/fitness", label: "Fitness" },
  { href: "/mind", label: "Mind" },
  { href: "/coach", label: "Coach" },
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
