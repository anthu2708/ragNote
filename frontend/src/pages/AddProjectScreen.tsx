import React, { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import { createChat } from "../utils/api";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";

const ACCEPTED = [".pdf", ".txt", ".md", ".doc", ".docx"];

function fmtSize(bytes: number) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[i]}`;
}

const AddProjectScreen: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickFile = () => fileInputRef.current?.click();

  const validateFile = (f: File) => {
    const okExt = ACCEPTED.some(ext => f.name.toLowerCase().endsWith(ext));
    if (!okExt) return `Unsupported file type: ${f.name}`;
    if (f.size > 25 * 1024 * 1024) return `${f.name} is too large (max 25MB).`;
    return null;
  };

  const handleFiles = (incoming: File[]) => {
    const errors: string[] = [];
    const valid: File[] = [];

    incoming.forEach(f => {
      const err = validateFile(f);
      if (err) errors.push(err); else valid.push(f);
    });

    // Merge + de-duplicate by name-size-lastModified
    setFiles(prev => {
      const merged = [...prev, ...valid];
      const seen = new Set<string>();
      const deduped: File[] = [];
      for (const f of merged) {
        const key = `${f.name}-${f.size}-${f.lastModified}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(f);
        }
      }
      return deduped;
    });

    setError(errors.length ? errors.join("\n") : null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const canSubmit = name.trim().length > 0 && files.length > 0 && !submitting;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await createChat(name.trim(), files); // backend expects key "files"
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Failed to create project. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-cover bg-center bg-[url('/src/assets/bg.png')]">
      <Sidebar />

      <main className="flex-1 sm:pl-60">
        <div className="px-4 md:px-8 py-6 md:py-10 pb-28 sm:pb-10">
          {/* Surface card */}
          <div className="w-full mx-auto rounded-3xl overflow-hidden bg-black/40 backdrop-blur ring-1 ring-white/10 shadow-xl">
            {/* Header */}
            <div className="px-4 md:px-6 py-5 border-b border-white/10">
              <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Create New Project</h1>
              <p className="text-white/70 text-sm md:text-base mt-1">Name your project and upload documents to start.</p>
            </div>

            {/* Form */}
            <div className="px-4 md:px-6 py-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm text-white/80 mb-1">Project name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Research Notes – Triassic"
                  className="w-full rounded-xl bg-white/10 text-white placeholder-white/60 ring-1 ring-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Uploader */}
              <div>
                <div className="flex items-center justify-between py-2">
                  <label className="block text-sm text-white/80">
                    Documents <span className="text-white/50">(PDF, DOC/DOCX, TXT/MD)</span>
                  </label>
                  {files.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onPickFile(); }}
                        className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/10"
                      >
                        Add more
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFiles([]); setError(null); }}
                        className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 ring-1 ring-white/10"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>

                <div
                  onClick={onPickFile}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={[
                    "w-full rounded-2xl border transition cursor-pointer",
                    "px-4 py-8 flex flex-col gap-3 items-center justify-center text-center",
                    "ring-1",
                    isDragging
                      ? "bg-white/20 border-white/30 ring-white/30"
                      : "bg-white/10 border-white/20 ring-white/10 hover:bg-white/15"
                  ].join(" ")}
                >
                  {files.length > 0 ? (
                    <div className="w-full text-white space-y-4">
                      <div className="flex items-center justify-between text-sm text-white/70">
                        <span>{files.length} file(s) selected</span>
                        <span>Total {fmtSize(totalSize)}</span>
                      </div>

                      {files.map((f, idx) => (
                        <div key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2">
                          <div className="truncate">
                            <div className="font-semibold truncate">{f.name}</div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm text-white/70">{fmtSize(f.size)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFiles(prev => prev.filter((x) => !(x.name === f.name && x.size === f.size && x.lastModified === f.lastModified)));
                              }}
                              className="px-2 py-1 text-sm rounded bg-white/10 hover:bg-white/20"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="text-xs text-white/60">Click anywhere in this box or <span className="underline">Add more</span> to add files.</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white/80">
                      <ArrowUpTrayIcon className="h-6 w-6" />
                      <div className="text-sm">Drag & drop or click to upload</div>
                      <div className="text-xs text-white/60">Max 25MB per file · {ACCEPTED.join(" ")}</div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED.join(",")}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleFiles(Array.from(e.target.files));
                    }}
                  />
                </div>

                {error && (
                  <div className="mt-2 whitespace-pre-line text-sm text-red-300">{error}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white/80 ring-1 ring-white/10 hover:bg-white/15 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!canSubmit}
                  className="px-5 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-medium ring-1 ring-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
};

export default AddProjectScreen;
