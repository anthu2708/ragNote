import React, {useRef, useState, useCallback} from "react";
import {useNavigate} from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import {ArrowUpTrayIcon} from "@heroicons/react/24/outline";
import {
    presignByKey,
    uploadToS3ViaPresignedPost,
    confirmS3Upload,
    createChat,
    attachFiles, discardFiles, ingestFileNow
} from "../utils/api";
import {fetchCurrentUser} from "../utils/auth";

const ACCEPTED = [".pdf"];

// ==== DEBUG ====
const DEBUG_UPLOAD = true;
const dlog = (...args: any[]) => DEBUG_UPLOAD && console.log("[AddProject]", ...args);

// =====================================

function fmtSize(bytes: number) {
    if (bytes === undefined || bytes === null) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) {
        n /= 1024;
        i++;
    }
    return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[i]}`;
}

async function getUserId(): Promise<string> {
    const cached = localStorage.getItem("user_id");
    if (cached) return cached;
    const user = await fetchCurrentUser().catch(() => null);
    const uid = user?.id;
    if (!uid) throw new Error("Missing user id for S3 key");
    localStorage.setItem("user_id", uid);
    return uid;
}


type UploadState = "idle" | "uploading" | "done" | "error";

const AddProjectScreen: React.FC = () => {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setDragging] = useState(false);

    // upload state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<Record<string, number>>({});
    const [status, setStatus] = useState<Record<string, UploadState>>({}); // chỉ set khi bắt đầu upload

    const fileInputRef = useRef<HTMLInputElement>(null);
    const onPickFile = () => fileInputRef.current?.click();

    // validate
    const validateFile = (f: File) => {
        const okExt = f.name.toLowerCase().endsWith(".pdf");
        if (!okExt) return `Only PDF is allowed in this sprint: ${f.name}`;
        if (f.size > 100 * 1024 * 1024) return `${f.name} is too large (max 100MB).`;
        return null;
    };

    // handle file: save to state
    const handleFiles = (incoming: File[]) => {
        dlog("handleFiles incoming:", incoming.map(f => ({name: f.name, size: f.size, type: f.type})));
        const errors: string[] = [];
        const valid: File[] = [];

        incoming.forEach(f => {
            const err = validateFile(f);
            if (err) errors.push(err); else valid.push(f);
        });

        setFiles(prev => {
            const merged = [...prev, ...valid];
            const seen = new Set<string>();
            const deduped: File[] = [];
            for (const f of merged) {
                const k = `${f.name}-${f.size}-${f.lastModified}`;
                if (!seen.has(k)) {
                    seen.add(k);
                    deduped.push(f);
                }
            }
            dlog("files after dedupe:", deduped.map(f => f.name));
            return deduped;
        });

        if (errors.length) setError(errors.join("\n"));
        // reset progress if choose other file
        setProgress({});
        setStatus({});
    };

    // drag & drop
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        dlog("onDrop", e.dataTransfer.files?.length || 0);
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

    const uploadOne = async (f: File): Promise<string> => {
        try {
            setStatus(s => ({...s, [f.name]: "uploading"}));
            setProgress(p => ({...p, [f.name]: 1})); // kick UI

            // 1. presign
            const {url, fields, file_id, key} = await presignByKey({
                filename: f.name,
                contentType: "application/pdf",
                size: f.size,
            });

            // 2. upload to S3 (presigned POST) + update progress %
            const {etag, location} = await uploadToS3ViaPresignedPost(
                url,
                fields,
                f,
                (pct: number) => setProgress(p => ({...p, [f.name]: pct}))
            );

            // 3. confirm w backend
            const s3_url = location || deriveS3Url(url, key);
            await confirmS3Upload({
                file_id,
                etag,
                s3_url,
                size: f.size,
                mime: "application/pdf",
            });

            console.log("[Ingest] Start ingesting...")
            try {
                await ingestFileNow(file_id);
            } catch (err) {
                throw err
            }
            console.log("[Ingest] Finish ingesting...")

            // 4. done UI
            setProgress(p => ({...p, [f.name]: 100}));
            setStatus(s => ({...s, [f.name]: "done"}));

            return file_id;
        } catch (e: any) {
            console.error("[AddProject] upload error", f.name, e);
            setStatus(s => ({...s, [f.name]: "error"}));
            setError(e?.response?.data?.detail || e?.message || `Upload failed for ${f.name}`);
            throw e;
        }
    };


    function deriveS3Url(presignUrl: string, key: string) {
        const u = new URL(presignUrl);
        const hostParts = u.host.split(".");
        let bucket = hostParts[0];
        if (!bucket || bucket === "s3") {
            const seg = u.pathname.split("/").filter(Boolean);
            if (seg.length > 0) bucket = seg[0];
        }
        return bucket ? `s3://${bucket}/${key}` : `s3://${key}`;
    }

    const handleCreate = async () => {
        setSubmitting(true);
        setError(null);
        const uploaded: string[] = []; // file_id sau confirm OK

        try {
            // 1) Upload (presign -> S3 -> confirm)
            for (const f of files) {
                const fileId = await uploadOne(f);
                uploaded.push(fileId);
            }

            // 2) Create a new chat with uploaded file
            const chat = await createChat(name.trim() || "Untitled");

            // 3) Attach file list to chat
            console.log("[Attach] Chat ID: ", chat.id, "Files_ID:", uploaded)
            if (uploaded.length) {
                await attachFiles({chat_id: chat.id, file_ids: uploaded});
            }

            // 4) Done
            navigate(`/chat/${chat.id}`);
        } catch (e: any) {
            console.error(e);
            setError(e?.response?.data?.detail || e.message || "Failed to create project");

            // 5) Discard file if chat is not created
            if (uploaded.length) {
                try {
                    await discardFiles({file_ids: uploaded});
                } catch {
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const canSubmit = files.length > 0 && !submitting;

    return (
        <div className="flex min-h-screen bg-cover bg-center bg-[url('/src/assets/bg.png')]">
            <Sidebar/>

            <main className="flex-1 sm:pl-60">
                <div className="px-4 md:px-8 py-6 md:py-10 pb-28 sm:pb-10">
                    <div
                        className="w-full mx-auto rounded-3xl overflow-hidden bg-black/40 backdrop-blur ring-1 ring-white/10 shadow-xl">
                        <div className="px-4 md:px-6 py-5 border-b border-white/10">
                            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Create New
                                Project</h1>
                            <p className="text-white/70 text-sm md:text-base mt-1">Select PDFs now — upload starts when
                                you press Create.</p>
                        </div>

                        <div className="px-4 md:px-6 py-5 space-y-5">
                            {/* Project name (không bắt upload) */}
                            <div>
                                <label className="block text-sm text-white/80 mb-1">Project name (optional)</label>
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
                                        Documents <span className="text-white/50">(PDF)</span>
                                    </label>
                                    {files.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onPickFile();
                                                }}
                                                className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/10"
                                            >
                                                Add more
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFiles([]);
                                                    setProgress({});
                                                    setStatus({});
                                                    setError(null);
                                                }}
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

                                            {files.map((f) => {
                                                const pct = progress[f.name] ?? 0;
                                                const st = status[f.name]; // undefined nếu chưa upload
                                                return (
                                                    <div
                                                        key={`${f.name}-${f.size}-${f.lastModified}`}
                                                        className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2"
                                                    >
                                                        <div className="truncate">
                                                            <div className="font-semibold truncate">{f.name}</div>
                                                            <div className="text-xs text-white/60">
                                                                {fmtSize(f.size)}{st ? ` · ${st}` : ""}
                                                            </div>
                                                            {/* Chỉ hiển thị progress khi đã bắt đầu upload */}
                                                            {st && (
                                                                <div className="h-1 mt-1 bg-white/10 rounded">
                                                                    <div className="h-1 rounded bg-white/70"
                                                                         style={{width: `${pct}%`}}/>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            {/* Chỉ hiện % khi đã bắt đầu */}
                                                            <span className="text-sm text-white/70"
                                                                  style={{minWidth: 36, textAlign: "right"}}>
                                {st ? `${pct}%` : ""}
                              </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setFiles(prev => prev.filter((x) => !(x.name === f.name && x.size === f.size && x.lastModified === f.lastModified)));
                                                                    setProgress(p => {
                                                                        const np = {...p};
                                                                        delete np[f.name];
                                                                        return np;
                                                                    });
                                                                    setStatus(s => {
                                                                        const ns = {...s};
                                                                        delete ns[f.name];
                                                                        return ns;
                                                                    });
                                                                }}
                                                                className="px-2 py-1 text-sm rounded bg-white/10 hover:bg-white/20"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            <div className="text-xs text-white/60">
                                                Click anywhere in this box or <span
                                                className="underline">Add more</span> to add files.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-white/80">
                                            <ArrowUpTrayIcon className="h-6 w-6"/>
                                            <div className="text-sm">Drag & drop or click to select files</div>
                                            <div className="text-xs text-white/60">Max 100MB per file
                                                · {ACCEPTED.join(" ")}</div>
                                        </div>
                                    )}

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={ACCEPTED.join(",")}
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            dlog("input.onChange", e.target.files?.length || 0);
                                            if (e.target.files) handleFiles(Array.from(e.target.files));
                                        }}
                                    />
                                </div>

                                {error && <div className="mt-2 whitespace-pre-line text-sm text-red-300">{error}</div>}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => navigate("/dashboard")}
                                    className="px-4 py-2 rounded-xl bg-white/10 text-white/80 ring-1 ring-white/10 hover:bg-white/15 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={!canSubmit}
                                    className="px-5 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-medium ring-1 ring-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {submitting && <span
                                        className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <Footer/>
            </main>
        </div>
    );
};

export default AddProjectScreen;
