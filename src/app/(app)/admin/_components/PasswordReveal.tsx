"use client";

import { useState } from "react";
import { Button } from "@/core/ui/button";

export function PasswordReveal({ password }: { password: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
      <p className="text-sm font-semibold text-gray-900">Temporary password</p>
      <p className="page-copy mt-1">Show this once. The user must change it at first sign-in.</p>
      <p className="mt-3 break-all font-medium text-gray-900">{password}</p>
      <Button type="button" variant="outline" className="mt-3 w-full" onClick={copy}>
        {copied ? "Copied" : "Copy password"}
      </Button>
    </div>
  );
}
