"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          margin: 0,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "2rem 2.5rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            maxWidth: "480px",
            width: "90%",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: "0.5rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#64748b",
              fontSize: "0.9rem",
              marginBottom: "0.75rem",
              lineHeight: 1.5,
            }}
          >
            {error.message || "A server-side error occurred."}
          </p>
          {error.digest && (
            <p
              style={{
                color: "#94a3b8",
                fontSize: "0.75rem",
                marginBottom: "1.25rem",
                fontFamily: "monospace",
              }}
            >
              Digest: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.6rem 1.5rem",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
