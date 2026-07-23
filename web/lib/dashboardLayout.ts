export type DashboardSectionId = "topics" | "vitals" | "insight" | "domains" | "healthspan";

export interface DashboardSectionMeta {
  id: DashboardSectionId;
  label: string;
  description: string;
}

export const DASHBOARD_SECTIONS: DashboardSectionMeta[] = [
  { id: "topics", label: "Topics strip", description: "Quick links into your top topic from each domain." },
  { id: "vitals", label: "Aging Pace & vitals", description: "The pace trail, this week's compass, and your four daily vitals." },
  { id: "insight", label: "Cross-domain insight", description: "The sharpest pattern found across what you've logged — only appears once there is one." },
  { id: "domains", label: "Domain tiles", description: "Recovery, Nutrition, Fitness, and Mind status at a glance." },
  { id: "healthspan", label: "Habit Momentum", description: "Your self-reported consistency trend across all four domains." },
];

export const DEFAULT_SECTION_ORDER: DashboardSectionId[] = ["topics", "vitals", "insight", "domains", "healthspan"];

export interface DashboardLayout {
  order: DashboardSectionId[];
  hidden: DashboardSectionId[];
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  order: DEFAULT_SECTION_ORDER,
  hidden: [],
};

/** Guards against a stale saved layout missing a section shipped later,
 * or naming one that no longer exists — always returns every current
 * section exactly once, in the saved order where possible. */
export function normalizeDashboardLayout(layout: DashboardLayout | null): DashboardLayout {
  if (!layout) return DEFAULT_DASHBOARD_LAYOUT;
  const known = new Set(DEFAULT_SECTION_ORDER);
  const order = layout.order.filter((id) => known.has(id));
  for (const id of DEFAULT_SECTION_ORDER) {
    if (!order.includes(id)) order.push(id);
  }
  const hidden = layout.hidden.filter((id) => known.has(id));
  return { order, hidden };
}
