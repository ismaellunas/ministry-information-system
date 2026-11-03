"use client";

import { useState, type ReactNode } from "react";
import { HomeActionCard } from "./HomeActionCard";

export function DepartmentCountCard({
  icon,
  tint,
  title,
  subtitle,
}: {
  icon: ReactNode;
  tint: string;
  title: string;
  subtitle: string;
}) {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <button
      type="button"
      className="block w-full text-left"
      onClick={() => {
        setShowNotice(true);
        setTimeout(() => setShowNotice(false), 2000);
      }}
    >
      <HomeActionCard icon={icon} tint={tint} title={title} subtitle={subtitle} />
      {showNotice && (
        <p className="mt-1 px-1 text-xs font-medium text-brand-500">Coming soon: Members Directory</p>
      )}
    </button>
  );
}
