"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadZone, UploadedImage } from "@/components/upload-zone";

interface FileEntry {
  path: string;
  content: string;
}

interface VersionSummary {
  id: string;
  versionNumber: number;
  createdAt: string;
}

interface ProjectDashboardProps {
  project: {
    id: string;
    name: string;
    platform: "SHOPIFY" | "WORDPRESS" | "PHP";
    createdAt: string;
    updatedAt: string;
    activeVersionId: string | null;
  };
  initialFiles: FileEntry[];
  initialVersions: VersionSummary[];
}

type GenState = "idle" | "running" | "error";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function buildFileTree(files: FileEntry[]) {
  const root: Record<string, unknown> = {};
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        node[part] = f.path; // leaf: store full path
      } else {
        node[part] = node[part] ?? {};
        node = node[part] as Record<string, unknown>;
      }
    });
  }
  return root;
}

function FileTree({
  node,
  onSelect,
  selected,
  depth = 0,
}: {
  node: Record<string, unknown>;
  onSelect: (path: string) => void;
  selected: string | null;
  depth?: number;
}) {
  const entries = Object.entries(node).sort(([a], [b]) => a.localeCompare(b));
  return (
    <ul style={{ paddingLeft: depth ? 12 : 0 }} className="text-sm">
      {entries.map(([name, value]) => {
        if (typeof value === "string") {
          const path = value;
          return (
            <li key={path}>
              <button
                onClick={() => onSelect(path)}
                className={`w-full text-left px-2 py-1 rounded truncate ${
                  selected === path ? "bg-primary/15 text-primary" : "text-white/70 hover:bg-white/5"
                }`}
                title={path}
              >
                {name}
              </button>
            </li>
          );
        }
        return (
          <li key={name} className="mb-0.5">
            <div className="px-2 py-1 text-white/50 font-medium">{name}/</div>
            <FileTree
              node={value as Record<string, unknown>}
              onSelect={onSelect}
              selected={selected}
              depth={depth + 1}
            />
          </li>
        );
      })}
    </ul>
  );
}

export function ProjectDashboard({ project, initialFiles, initialVersions }: ProjectDashboardProps) {
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [genState, setGenState] = useState<GenState>("idle");
  const [genMessage, setGenMessage] = useState("");
  const [files, setFiles] = useState<FileEntry[]>(initialFiles);
  const [versions, setVersions] = useState<VersionSummary[]>(initialVersions);
  const [selectedPath, setSelectedPath] = useState<string | null>(
    initialFiles[0]?.path ?? null
  );
  const [editorContent, setEditorContent] = useState(initialFiles[0]?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeVersionId, setActiveVersionId] = useState(project.activeVersionId);

  const tree = useMemo(() => buildFileTree(files), [files]);

  useEffect(() => {
    return () => {
      for (const image of images) URL.revokeObjectURL(image.previewUrl);
    };
  }, []);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setGenMessage("Describe the website you want AI to build first.");
      setGenState("error");
      return;
    }
    setGenState("running");
    setGenMessage("Analyzing prompt...");

    try {
      const referenceImages = await Promise.all(
        images.map(async (img) => ({
          mimeType: img.file.type,
          data: await fileToBase64(img.file),
          filename: img.file.name,
        }))
      );

      setGenMessage("Generating files...");
      const res = await fetch(`/api/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, referenceImages }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Generation failed.");
      }

      setGenMessage("Completed");
      setGenState("idle");
      setFiles(data.files);
      setActiveVersionId(data.version.id);
      setVersions((prev) => [
        { id: data.version.id, versionNumber: data.version.versionNumber, createdAt: data.version.createdAt },
        ...prev,
      ]);
      if (data.files[0]) {
        setSelectedPath(data.files[0].path);
        setEditorContent(data.files[0].content);
      }
    } catch (err) {
      setGenState("error");
      setGenMessage(err instanceof Error ? err.message : "Generation failed.");
    }
  }

  function selectFile(path: string) {
    const f = files.find((x) => x.path === path);
    if (!f) return;
    setSelectedPath(path);
    setEditorContent(f.content);
    setSaveMsg("");
  }

  async function saveFile() {
    if (!selectedPath || !activeVersionId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`/api/projects/${project.id}/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: activeVersionId,
          path: selectedPath,
          content: editorContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setFiles((prev) =>
        prev.map((f) => (f.path === selectedPath ? { ...f, content: editorContent } : f))
      );
      setSaveMsg("Saved");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function restoreVersion(versionId: string) {
    try {
      const res = await fetch(`/api/projects/${project.id}/versions/${versionId}/restore`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to restore version.");
      setFiles(data.files);
      setActiveVersionId(versionId);
      setSaveMsg("Restored");
      if (data.files[0]) {
        setSelectedPath(data.files[0].path);
        setEditorContent(data.files[0].content);
      }
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Unable to restore version.");
    }
  }

  function downloadZip(versionId?: string) {
    const url = versionId
      ? `/api/projects/${project.id}/zip?versionId=${versionId}`
      : `/api/projects/${project.id}/zip`;
    window.location.href = url;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted">
            {project.platform} · Updated {new Date(project.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/projects/${project.id}/preview`}
            className="btn-secondary text-sm"
            aria-disabled={!activeVersionId}
            onClick={(e) => {
              if (!activeVersionId) e.preventDefault();
            }}
          >
            Preview
          </a>
          <button
            className="btn-primary disabled:opacity-40"
            disabled={!activeVersionId}
            onClick={() => downloadZip()}
          >
            Download ZIP
          </button>
        </div>
      </header>

      {/* Generate panel */}
      <section className="glass rounded-xl2 p-5">
        <h2 className="font-semibold mb-3">Generate / Regenerate</h2>
        <textarea
          className="input-field min-h-[100px] resize-y"
          placeholder="Describe the website you want AI to build..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="mt-4">
          <UploadZone images={images} onChange={setImages} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={genState === "running"}
            className="btn-primary disabled:opacity-50"
          >
            {genState === "running" ? "Generating..." : "Generate Website"}
          </button>
          {genMessage && (
            <span className={`text-sm ${genState === "error" ? "text-red-400" : "text-muted"}`}>
              {genMessage}
            </span>
          )}
        </div>
      </section>

      {/* File explorer + editor */}
      {files.length > 0 ? (
        <section className="grid md:grid-cols-[220px_1fr] gap-4">
          <div className="glass rounded-xl2 p-3 max-h-[480px] overflow-y-auto">
            <FileTree node={tree} onSelect={selectFile} selected={selectedPath} />
          </div>
          <div className="glass rounded-xl2 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70 truncate">{selectedPath}</span>
              <div className="flex items-center gap-2">
                {saveMsg && <span className="text-xs text-muted">{saveMsg}</span>}
                <button
                  onClick={saveFile}
                  disabled={saving || !selectedPath}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 min-h-[360px] bg-black/30 border border-border rounded-lg p-3 text-xs font-mono text-white/90 outline-none focus:border-primary/50"
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              spellCheck={false}
            />
          </div>
        </section>
      ) : (
        <div className="glass rounded-xl2 p-10 text-center text-muted text-sm">
          No files yet. Generate your first version above.
        </div>
      )}

      {/* Versions */}
      <section>
        <h2 className="font-semibold mb-3">Versions</h2>
        {versions.length === 0 ? (
          <p className="text-sm text-muted">No versions yet</p>
        ) : (
          <ul className="space-y-2">
            {versions
              .slice()
              .sort((a, b) => b.versionNumber - a.versionNumber)
              .map((v) => (
                <li
                  key={v.id}
                  className="glass rounded-lg px-4 py-2.5 flex items-center justify-between text-sm"
                >
                  <span>
                    Version {v.versionNumber}{" "}
                    <span className="text-muted">
                      · {new Date(v.createdAt).toLocaleString()}
                    </span>
                    {v.id === activeVersionId && (
                      <span className="ml-2 text-primary text-xs">active</span>
                    )}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => restoreVersion(v.id)}
                      className="btn-secondary text-xs px-3 py-1"
                      disabled={v.id === activeVersionId}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => downloadZip(v.id)}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      ZIP
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
