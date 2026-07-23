"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { domainOrderFromProfile, domainPlanFromProfile, type UserProfile, type DomainKey } from "@/lib/profile";
import { topicGroupsFromOrder } from "@/lib/topics";
import { TopicIcon } from "@/lib/icons";
import { ChevronRight } from "lucide-react";
import styles from "./page.module.css";

export default function TopicsPage() {
  const [profile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);

  const order = domainOrderFromProfile(profile);
  const groups = topicGroupsFromOrder(order, profile);
  const plan = domainPlanFromProfile(profile);
  const hasPriority = !!profile?.primaryGoals.length;

  const [activeDomain, setActiveDomain] = useState<DomainKey>(order[0]);
  const activeGroup = groups.find((g) => g.domain === activeDomain) ?? groups[0];

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

      <div className={styles.tabBar} role="tablist">
        {groups.map((group) => (
          <button
            key={group.domain}
            type="button"
            role="tab"
            aria-selected={activeGroup.domain === group.domain}
            className={activeGroup.domain === group.domain ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            style={activeGroup.domain === group.domain ? { borderColor: group.color, color: "var(--ink)" } : undefined}
            onClick={() => setActiveDomain(group.domain)}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        <section key={activeGroup.domain} className={styles.group} aria-labelledby={`topics-${activeGroup.domain}`}>
          <div className={styles.groupHead} style={{ borderLeftColor: activeGroup.color }}>
            <h2 id={`topics-${activeGroup.domain}`} className={styles.groupTitle}>
              {activeGroup.label}
            </h2>
            <p className={styles.groupPlan}>{plan[activeGroup.domain]}</p>
          </div>

          <div className={styles.grid}>
            {activeGroup.topics.map((topic) => (
              <Link key={topic.id} href={topic.href} className={styles.card}>
                <span className={styles.cardIconBadge} style={{ background: activeGroup.color }}>
                  <TopicIcon name={topic.icon} className={styles.cardIcon} aria-hidden="true" />
                </span>
                <span className={styles.cardBody}>
                  <span className={styles.cardTitle}>{topic.title}</span>
                  <p className={styles.cardDesc}>{topic.description}</p>
                  <span className={styles.cardFeature} style={{ color: activeGroup.color }}>{topic.feature}</span>
                </span>
                <ChevronRight className={styles.cardChevron} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
