import type { Pose } from "@/lib/workouts";

/**
 * A small set of illustrated movement-pattern icons — the honest
 * substitute for video demonstration this app can actually deliver.
 * Each exercise maps to one of these by movement pattern (squat, push,
 * pull, lunge, core, cardio, stretch, rest), not a unique photo or clip
 * per exercise, which this app has no pipeline to produce.
 */
export function ExercisePose({ pose, size = 40 }: { pose: Pose; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (pose) {
    case "squat":
      return (
        <svg {...common}>
          <circle cx="24" cy="10" r="4" />
          <path d="M24 14 L24 26" />
          <path d="M24 26 L16 34 L19 42" />
          <path d="M24 26 L32 34 L29 42" />
          <path d="M24 17 L15 22" />
          <path d="M24 17 L33 22" />
        </svg>
      );
    case "push":
      return (
        <svg {...common}>
          <circle cx="9" cy="21" r="4" />
          <path d="M13 22 L39 27" />
          <path d="M17 23 L15 36" />
          <path d="M39 27 L45 35" />
        </svg>
      );
    case "pull":
      return (
        <svg {...common}>
          <circle cx="24" cy="9" r="4" />
          <path d="M24 13 L20 27" />
          <path d="M20 27 L16 42" />
          <path d="M20 27 L25 42" />
          <path d="M22 16 L13 19 L18 25" />
        </svg>
      );
    case "lunge":
      return (
        <svg {...common}>
          <circle cx="24" cy="8" r="4" />
          <path d="M24 12 L24 24" />
          <path d="M24 24 L30 32 L30 42" />
          <path d="M24 24 L16 34 L11 41" />
          <path d="M24 16 L18 23" />
          <path d="M24 16 L30 22" />
        </svg>
      );
    case "core":
      return (
        <svg {...common}>
          <circle cx="7" cy="19" r="4" />
          <path d="M11 20 L38 24" />
          <path d="M15 22 L14 35" />
          <path d="M38 24 L44 34" />
        </svg>
      );
    case "cardio":
      return (
        <svg {...common}>
          <circle cx="25" cy="8" r="4" />
          <path d="M24 12 L22 25" />
          <path d="M22 25 L29 29 L31 21" />
          <path d="M22 25 L15 38" />
          <path d="M23 14 L31 8" />
          <path d="M23 14 L15 19" />
        </svg>
      );
    case "stretch":
      return (
        <svg {...common}>
          <circle cx="17" cy="15" r="4" />
          <path d="M24 24 L19 18" />
          <path d="M24 24 L24 42" />
          <path d="M19 18 L14 30" />
        </svg>
      );
    case "rest":
    default:
      return (
        <svg {...common}>
          <circle cx="24" cy="10" r="4" />
          <path d="M24 14 L24 26" />
          <path d="M24 26 L18 32 L18 40" />
          <path d="M24 26 L30 32 L30 40" />
          <path d="M24 17 L19 23" />
          <path d="M24 17 L29 23" />
        </svg>
      );
  }
}
