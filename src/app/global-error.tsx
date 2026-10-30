"use client";

import { useEffect, type CSSProperties } from "react";
import { isConnectionError, staysOpenOffline } from "./offline-fallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const offline = isConnectionError(error);
  useEffect(() => {
    if (!offline || staysOpenOffline(window.location.pathname)) return;
    window.location.assign("/calendar");
  }, [offline]);
  if (offline) {
    return (
      <html lang="en">
        <body style={{ margin: 0, minHeight: "100vh", background: "#f9fafb" }} />
      </html>
    );
  }
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#f9fafb", color: "#1e2939", fontFamily: "Outfit, system-ui, sans-serif" }}>
        <main style={{ maxWidth: "24rem", margin: "0 auto", padding: "2rem 1rem" }}>
          <h1 style={{ margin: 0, fontSize: "18px", lineHeight: "28px", fontWeight: 600, color: "#101828" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "1rem 0 0", fontSize: "14px", lineHeight: "20px", color: "#6a7282" }}>
            This screen hit an error. Try it again.
          </p>
          <a href="/calendar" style={primary}>Try the calendar</a>
          <button type="button" style={secondary} onClick={() => reset()}>
            Try again
          </button>
          <a href="/login" style={secondary}>Sign in</a>
        </main>
      </body>
    </html>
  );
}

const primary: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  minHeight: 44,
  marginTop: "1rem",
  borderRadius: 10,
  background: "#465fff",
  color: "#fff",
  fontSize: 14,
  fontWeight: 500,
  textDecoration: "none",
};

const secondary: CSSProperties = {
  ...primary,
  background: "#fff",
  color: "#344054",
  border: "1px solid #d0d5dd",
  width: "100%",
};
