import Link from "next/link";
import styles from "./SummaryCard.module.css";

export function SummaryCard({
  label,
  title,
  detail,
  href,
}: {
  label: string;
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <Link href={href} className={styles.card}>
      <span className={styles.label}>{label}</span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.detail}>{detail}</p>
      <span className={styles.link}>View →</span>
    </Link>
  );
}
