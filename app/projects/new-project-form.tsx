"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlatformCard } from "@/components/platform-card";
import { PLATFORM_LIST, PlatformId } from "@/lib/platforms/definitions";

export function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandStyle, setBrandStyle] = useState("");
  const [requiredPages, setRequiredPages] = useState("");
  const [features, setFeatures] = useState("");
  const [platform, setPlatform] = useState<PlatformId>("SHOPIFY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        targetAudience,
        brandStyle,
        requiredPages,
        features,
        platform,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Unable to create project.");
      return;
    }
    router.push(`/projects/${data.project.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-xl2 p-5 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted block mb-1.5">Project name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1.5">Target audience</label>
          <input
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted block mb-1.5">Website description</label>
        <textarea
          required
          placeholder="Describe the website you want AI to build..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field min-h-[90px] resize-y"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted block mb-1.5">Brand style</label>
          <input value={brandStyle} onChange={(e) => setBrandStyle(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1.5">Required pages</label>
          <input
            value={requiredPages}
            onChange={(e) => setRequiredPages(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1.5">Features</label>
          <input value={features} onChange={(e) => setFeatures(e.target.value)} className="input-field" />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted block mb-2">Platform</label>
        <div className="grid sm:grid-cols-3 gap-3">
          {PLATFORM_LIST.map((p) => (
            <PlatformCard key={p.id} platform={p} selected={platform === p.id} onSelect={setPlatform} />
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
        {loading ? "Creating..." : "Create Website"}
      </button>
    </form>
  );
}
