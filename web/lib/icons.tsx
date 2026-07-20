import {
  Moon,
  Watch,
  HeartPulse,
  Camera,
  ChefHat,
  Dumbbell,
  Wrench,
  Wind,
  NotebookPen,
  Timer,
  Home as HomeIcon,
  LayoutGrid,
  Utensils,
  Brain,
  MessageCircle,
  Settings as SettingsIcon,
  Dna,
  Activity,
  Zap,
  Sparkles,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { DomainKey } from "./profile";

/** Every icon a Topic can reference, keyed by the string stored on
 * `Topic.icon` — one small registry instead of scattering emoji through
 * data files, so the visual language is consistent and swappable. */
export const TOPIC_ICONS: Record<string, LucideIcon> = {
  moon: Moon,
  watch: Watch,
  "heart-pulse": HeartPulse,
  camera: Camera,
  "chef-hat": ChefHat,
  dumbbell: Dumbbell,
  wrench: Wrench,
  wind: Wind,
  "notebook-pen": NotebookPen,
  timer: Timer,
  dna: Dna,
};

export function TopicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = TOPIC_ICONS[name] ?? Sparkles;
  return <Icon {...props} />;
}

export const NAV_ICONS: Record<string, LucideIcon> = {
  "/home": HomeIcon,
  "/topics": LayoutGrid,
  "/recovery": Moon,
  "/nutrition": Utensils,
  "/fitness": Dumbbell,
  "/mind": Brain,
  "/coach": MessageCircle,
  "/settings": SettingsIcon,
};

export const DOMAIN_ICONS: Record<DomainKey, LucideIcon> = {
  sleep: Moon,
  nutrition: Utensils,
  fitness: Dumbbell,
  mind: Brain,
};

export const VITAL_ICONS = {
  sleep: Moon,
  restingHR: HeartPulse,
  recovery: Activity,
  load: Zap,
};
