// Fallback type declaration for lucide-react (overridden by the package's own types post-install).
declare module "lucide-react" {
  import type { FC, SVGProps } from "react";
  export type LucideProps = SVGProps<SVGSVGElement> & { size?: number | string };
  export type LucideIcon = FC<LucideProps>;
  export const CalendarDays: LucideIcon;
  export const Building2: LucideIcon;
  export const Bell: LucideIcon;
  export const Home: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const WifiOff: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const Plus: LucideIcon;
  export const Pencil: LucideIcon;
  export const Trash2: LucideIcon;
  export const Check: LucideIcon;
  export const X: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const LogOut: LucideIcon;
  export const User: LucideIcon;
  export const Shield: LucideIcon;
  export const Church: LucideIcon;
  export const Users: LucideIcon;
  export const ClipboardList: LucideIcon;
}
