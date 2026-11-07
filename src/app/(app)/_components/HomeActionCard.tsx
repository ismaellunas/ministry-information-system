import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

export function HomeActionCard({
  icon,
  tint,
  title,
  subtitle,
  href,
  external = false,
}: {
  icon: ReactNode;
  tint: string;
  title: string;
  subtitle: string;
  href?: string;
  external?: boolean;
}) {
  const className =
    "relative flex min-h-11 items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-theme-xs transition-colors hover:border-gray-200";
  const body = (
    <>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
        <p className="truncate page-copy">{subtitle}</p>
      </div>
      <ArrowUpRight className="h-5 w-5 shrink-0 text-gray-300" />
    </>
  );

  if (href && external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
        <span className="sr-only">Opens in a new tab</span>
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
