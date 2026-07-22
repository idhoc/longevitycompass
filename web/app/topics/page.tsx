"use client";

import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { domainOrderFromProfile, domainPlanFromProfile, type UserProfile } from "@/lib/profile";
import { topicGroupsFromOrder } from "@/lib/topics";
import { GENETICS_STORAGE_KEY, type GeneticProfile } from "@/lib/genetics23andme";
import { TopicIcon } from "@/lib/icons";
import { Dna, ChevronRight } from "lucide-react";
import styles from "./page.module.css";

export default function TopicsPage() {
  const [profile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [genetics] = useLocalStorageState<GeneticProfile | null>(GENETICS_STORAGE_KEY, null);

  const order = domainOrderFromProfile(profile);
  const groups = topicGroupsFromOrder(order, profile);
  const plan = domainPlanFromProfile(profile);
  const hasPriority = !!profile?.primaryGoals.length;

  return (
    <div className={styles.page}>
      <SiteNav />

      <div className={styles.header}>
        <span className="eyebrow" style={{ color: "var(--signal)" }}>Topics</span>
        <h1>Where the work happens</h1>
        <p className={styles.headerSub}>
          {hasPriority
            ? "Ordered around what you told us matters most — every domain is still one tap away."
            : "One set of topics per domain, each with something the others don't have. Set a priority in onboarding or Settings and this list reorders around it."}
        </p>
      </div>

      <div className={styles.groups}>
        {groups.map((group) => (
          <section key={group.domain} className={styles.group} aria-labelledby={`topics-${group.domain}`}>
            <div className={styles.groupHead} style={{ borderLeftColor: group.color }}>
              <h2 id={`topics-${group.domain}`} className={styles.groupTitle}>
                {group.label}
              </h2>
              <p className={styles.groupPlan}>{plan[group.domain]}</p>
            </div>

            <div className={styles.grid}>
              {group.topics.map((topic) => (
                <Link key={topic.id} href={topic.href} className={styles.card}>
                  <span className={styles.cardIconBadge} style={{ background: group.color }}>
                    <TopicIcon name={topic.icon} className={styles.cardIcon} aria-hidden="true" />
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.cardTitle}>{topic.title}</span>
                    <p className={styles.cardDesc}>{topic.description}</p>
                    <span className={styles.cardFeature} style={{ color: group.color }}>{topic.feature}</span>
                  </span>
                  <ChevronRight className={styles.cardChevron} aria-hidden="true" />
                </Link>
              ))}

              {!genetics && (group.domain === "nutrition" || group.domain === "fitness") && (
                <Link href="/settings" className={`${styles.card} ${styles.cardGhost}`}>
                  <span className={styles.cardIconBadge} style={{ background: group.color }}>
                    <Dna className={styles.cardIcon} aria-hidden="true" />
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.cardTitle}>Add 23andMe data</span>
                    <p className={styles.cardDesc}>
                      Optional — import your raw data in Settings to unlock genetic context right
                      here in {group.label.toLowerCase()}.
                    </p>
                  </span>
                  <ChevronRight className={styles.cardChevron} aria-hidden="true" />
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
