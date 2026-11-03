import { BookOpen, Flower2, Users, Zap, type LucideIcon } from "lucide-react";
import type { MinistryCode } from "@/domain/types";

export const DEPARTMENT_ICONS: { code: MinistryCode; icon: LucideIcon; tint: string }[] = [
  { code: "MM", icon: Users, tint: "bg-blue-50 text-blue-500" },
  { code: "WM", icon: Flower2, tint: "bg-purple-50 text-purple-500" },
  { code: "YA", icon: Zap, tint: "bg-yellow-50 text-yellow-600" },
  { code: "CE", icon: BookOpen, tint: "bg-emerald-50 text-emerald-500" },
];
