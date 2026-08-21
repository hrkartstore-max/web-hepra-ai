"use client";

import { useState } from "react";
import Link from "next/link";

const BREAKPOINTS = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
} as const;

interface PreviewFrameProps {
  projectName: string;
  platform: "SHOPIFY" | "WORDPRESS" | "PHP";
  entryPath: string | null;
  entryContent: string | null;
  isStaticHtml: boolean;
}

export function PreviewFrame({
  projectName,
  platform,
  entryPath,
  entryContent,
  isStaticHtml,
}: PreviewFrameProps) {
  const [device, setDevice] = useState<keyof typeof BREAKPOINTS>("desktop");
  const [key, setKey] = useState(0);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div>
          <Link href="/projects" className="text-xs text-muted hover:text-white">
            ← Back
          </Link>
          <h1 className="font-semibold text-sm mt-0.5">{projectName} — Preview</h1>
        </div>
        <div className="flex items-center gap-2">
          {(Object.keys(BREAKPOINTS) as Array<keyof typeof BREAKPOINTS>).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`text-xs px-3 py-1.5 rounded-full border capitalize ${
                device === d
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-white/60 hover:text-white"
              }`}
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setKey((k) => k + 1)}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-white/60 hover:text-white"
          >
            Refresh
          </button>
        </div>
      </header>

      {!isStaticHtml && (
        <div className="px-5 py-2 text-xs bg-primary/10 text-primary/90 border-b border-primary/20">
          {platform === "SHOPIFY"
            ? `Showing source for ${entryPath}. Full Liquid rendering requires pushing this theme to a Shopify store — that's exactly what the ZIP download is for.`
            : platform === "WORDPRESS"
            ? `Showing source for ${entryPath}. Full PHP/WordPress rendering requires installing this theme on a WordPress site — that's exactly what the ZIP download is for.`
            : `Showing source for ${entryPath}. PHP execution requires a PHP server — that's exactly what the ZIP download is for.`}
        </div>
      )}

      <div className="flex-1 flex items-start justify-center py-6 px-4 overflow-auto">
        <div
          style={{ width: BREAKPOINTS[device], maxWidth: "100%" }}
          className="h-[75vh] bg-white rounded-lg overflow-hidden border border-border transition-all"
        >
          {entryContent ? (
            isStaticHtml ? (
              <iframe
                key={key}
                title="Preview"
                srcDoc={entryContent}
                sandbox="allow-scripts"
                className="w-full h-full"
              />
            ) : (
              <pre className="w-full h-full overflow-auto p-4 text-[11px] font-mono text-gray-800 whitespace-pre-wrap">
                {entryContent}
              </pre>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              No entry file found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
