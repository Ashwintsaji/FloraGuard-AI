"use client";

import { useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  UploadCloud,
  ImageOff,
  X,
  Loader2,
  Leaf,
  AlertTriangle,
  RotateCcw,
  ScanLine,
  KeyRound,
} from "lucide-react";

type Status = "idle" | "ready" | "analyzing" | "done" | "error";

interface ApiErrorBody {
  error: string;
  message: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function specimenNumber() {
  // A stable-looking "accession number" for the specimen label, generated per upload.
  const n = Math.floor(Math.random() * 900000) + 100000;
  return `FG-${n}`;
}

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfigError, setIsConfigError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tagNumber, setTagNumber] = useState(specimenNumber());

  const inputRef = useRef<HTMLInputElement>(null);

  const resetAll = useCallback(() => {
    setStatus("idle");
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setReport(null);
    setErrorMessage(null);
    setIsConfigError(false);
    setTagNumber(specimenNumber());
  }, [previewUrl]);

  const handleFile = useCallback(
    (incoming: File | undefined | null) => {
      if (!incoming) return;

      if (!ACCEPTED_TYPES.includes(incoming.type)) {
        setStatus("error");
        setErrorMessage("Unsupported file type. Please upload a JPEG, PNG, or WEBP image.");
        return;
      }
      if (incoming.size > 10 * 1024 * 1024) {
        setStatus("error");
        setErrorMessage("That image is larger than 10 MB. Please choose a smaller photo.");
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setFile(incoming);
      setPreviewUrl(URL.createObjectURL(incoming));
      setReport(null);
      setErrorMessage(null);
      setIsConfigError(false);
      setTagNumber(specimenNumber());
      setStatus("ready");
    },
    [previewUrl]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      handleFile(dropped);
    },
    [handleFile]
  );

  const analyze = useCallback(async () => {
    if (!file) return;
    setStatus("analyzing");
    setErrorMessage(null);
    setIsConfigError(false);

    try {
      const fd = new FormData();
      fd.append("image", file);

      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const body = (await res.json()) as { report?: string } & Partial<ApiErrorBody>;

      if (!res.ok) {
        if (body.error === "CONFIG_ERROR") {
          setIsConfigError(true);
        }
        setStatus("error");
        setErrorMessage(body.message || "Something went wrong. Please try again.");
        return;
      }

      setReport(body.report ?? "");
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }, [file]);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8 lg:px-16">
      {/* Header */}
      <header className="mx-auto mb-10 flex max-w-6xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-moss-600/50 bg-canopy-800">
            <Leaf className="h-5 w-5 text-moss-400" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-parchment-100 sm:text-2xl">
              FloraGuard <span className="text-moss-400">AI</span>
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-parchment-400/70">
              Plant Disease &amp; Health Identifier
            </p>
          </div>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-parchment-400/80 sm:text-right">
          Photograph a leaf, stem, or whole plant. Receive a field-diagnostic report in seconds.
        </p>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* LEFT: Upload / Preview panel */}
        <section className="specimen-tag rounded-sm p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-parchment-400/60">
              Specimen No. {tagNumber}
            </span>
            {file && (
              <button
                onClick={resetAll}
                className="flex items-center gap-1 text-xs text-parchment-400/70 transition hover:text-blight-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Start over
              </button>
            )}
          </div>

          {!previewUrl && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              className={`flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed px-6 text-center transition-colors ${
                isDragging
                  ? "border-moss-400 bg-moss-700/10"
                  : "border-canopy-600 hover:border-moss-600"
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-canopy-700">
                <UploadCloud className="h-6 w-6 text-moss-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-medium text-parchment-100">
                  Drop a plant photo here, or click to browse
                </p>
                <p className="mt-1 text-xs text-parchment-400/60">
                  JPEG, PNG, or WEBP · up to 10 MB
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          {previewUrl && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-sm border border-canopy-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Uploaded plant preview"
                  className="max-h-[420px] w-full object-cover"
                />
                {status === "analyzing" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canopy-950/80 backdrop-blur-sm">
                    <ScanLine className="h-7 w-7 animate-pulse text-moss-400" />
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-parchment-200">
                      Scanning tissue…
                    </p>
                    <div className="h-1 w-40 overflow-hidden rounded-full bg-canopy-700">
                      <div className="h-full w-1/2 animate-[loadbar_1.2s_ease-in-out_infinite] bg-moss-400" />
                    </div>
                  </div>
                )}
                {!["analyzing"].includes(status) && (
                  <button
                    onClick={resetAll}
                    aria-label="Remove image"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-canopy-950/80 text-parchment-200 transition hover:bg-blight-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px] text-parchment-400/60">
                <span className="truncate">{file?.name}</span>
                <span aria-hidden>·</span>
                <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ""}</span>
              </div>

              {(status === "ready" || status === "analyzing") && (
                <button
                  onClick={analyze}
                  disabled={status === "analyzing"}
                  className="flex w-full items-center justify-center gap-2 rounded-sm bg-moss-600 py-3 font-medium text-parchment-100 transition hover:bg-moss-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === "analyzing" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <ScanLine className="h-4 w-4" />
                      Diagnose this plant
                    </>
                  )}
                </button>
              )}

              {status === "done" && (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-sm border border-canopy-600 py-3 font-medium text-parchment-200 transition hover:border-moss-500"
                >
                  <UploadCloud className="h-4 w-4" />
                  Analyze a different photo
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </button>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="mt-4 flex items-start gap-3 rounded-sm border border-blight-600/50 bg-blight-600/10 p-4">
              {isConfigError ? (
                <KeyRound className="mt-0.5 h-5 w-5 flex-shrink-0 text-blight-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blight-400" />
              )}
              <div>
                <p className="text-sm font-medium text-parchment-100">
                  {isConfigError ? "Server not configured" : "Couldn't complete diagnosis"}
                </p>
                <p className="mt-1 text-sm text-parchment-300/80">{errorMessage}</p>
                {isConfigError && (
                  <p className="mt-2 font-mono text-xs text-parchment-400/60">
                    Set GEMINI_API_KEY in .env.local, then restart the server.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: Report panel */}
        <section className="flex min-h-[420px] flex-col rounded-sm border border-canopy-600 bg-parchment-200">
          <div className="flex items-center justify-between border-b border-canopy-600/20 px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-canopy-900">
              Diagnostic Report
            </h2>
            {status === "done" && (
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-moss-700">
                Specimen {tagNumber}
              </span>
            )}
          </div>

          <div className="flex-1 px-6 py-6">
            {status === "idle" || (status === "ready" && !report) || status === "error" ? (
              <EmptyState hasError={status === "error" && !isConfigError} />
            ) : status === "analyzing" ? (
              <ReportSkeleton />
            ) : report ? (
              <div className="report-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
              </div>
            ) : (
              <EmptyState hasError={false} />
            )}
          </div>
        </section>
      </div>

      <footer className="mx-auto mt-10 max-w-6xl text-center font-mono text-[11px] text-parchment-400/40">
        FloraGuard AI — diagnostics are AI-generated estimates, not professional agronomic advice.
      </footer>

      <style jsx global>{`
        @keyframes loadbar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </main>
  );
}

function EmptyState({ hasError }: { hasError: boolean }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-canopy-900/5">
        <ImageOff className="h-6 w-6 text-canopy-700/40" strokeWidth={1.5} />
      </div>
      <p className="max-w-xs text-sm text-canopy-900/50">
        {hasError
          ? "The last photo couldn't be diagnosed. Upload a clear, well-lit image to try again."
          : "Upload a plant photo on the left to generate a diagnostic report here."}
      </p>
    </div>
  );
}

function ReportSkeleton() {
  const widths = ["w-2/3", "w-full", "w-5/6", "w-1/2", "w-full", "w-3/4", "w-1/3"];
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-1/3 rounded bg-canopy-900/10" />
      {widths.map((w, i) => (
        <div key={i} className={`h-3 ${w} rounded bg-canopy-900/10`} />
      ))}
      <div className="h-4 w-1/4 rounded bg-canopy-900/10" />
      {widths.slice(0, 4).map((w, i) => (
        <div key={`b-${i}`} className={`h-3 ${w} rounded bg-canopy-900/10`} />
      ))}
    </div>
  );
}
