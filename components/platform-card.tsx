"use client";

import { PlatformDefinition } from "@/lib/platforms/definitions";

interface PlatformCardProps {
  platform: PlatformDefinition;
  selected: boolean;
  onSelect: (id: PlatformDefinition["id"]) => void;
}

export function PlatformCard({ platform, selected, onSelect }: PlatformCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(platform.id)}
      aria-pressed={selected}
      className={`text-left rounded-xl2 border p-5 transition w-full ${
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary/50"
          : "border-border bg-panel hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-white">{platform.label}</h3>
        <span
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            selected ? "border-primary" : "border-white/30"
          }`}
        >
          {selected && <span className="w-2 h-2 rounded-full bg-primary" />}
        </span>
      </div>
      <p className="text-sm text-muted mb-3">{platform.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {platform.capabilities.map((cap) => (
          <span
            key={cap}
            className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10"
          >
            {cap}
          </span>
        ))}
      </div>
    </button>
  );
}
