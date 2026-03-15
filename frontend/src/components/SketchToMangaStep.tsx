"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Toast from "@/components/Toast";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const genres = [
  { id: "shonen", label: "Shonen" },
  { id: "shoujo", label: "Shojo" },
  { id: "seinen", label: "Seinen" },
  { id: "kodomo", label: "Kodomo" },
];

interface SketchFile {
  id: string;
  file: File;
  previewUrl: string;
  base64: string; // raw base64 without data URL prefix
}

interface ReferenceImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  characterName: string;
}

interface ExtractedCharacter {
  name: string;
  role: string;
  visual_description: string;
  personality: string;
}

interface SetteiSheet {
  characterName: string;
  imageDataUrl: string;
  source: "auto" | "user";
}

interface ConvertedImage {
  index: number;
  imageDataUrl: string;
  status: "pending" | "generating" | "complete" | "error";
  errorMessage?: string;
}

type Phase = "idle" | "extracting" | "settei" | "converting" | "done";

export default function SketchToMangaStep() {
  const { getToken } = useAuth();

  const [sketches, setSketches] = useState<SketchFile[]>([]);
  const [genre, setGenre] = useState("shonen");
  const [styleHint, setStyleHint] = useState("");
  const [includeDialogue, setIncludeDialogue] = useState(false);
  const [dialogueHints, setDialogueHints] = useState("");
  const [autoExtract, setAutoExtract] = useState(true);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [extractedCharacters, setExtractedCharacters] = useState<ExtractedCharacter[]>([]);
  const [setteiSheets, setSetteiSheets] = useState<SetteiSheet[]>([]);
  const [currentPhase, setCurrentPhase] = useState<Phase>("idle");
  const [setteiProgress, setSetteiProgress] = useState({ done: 0, total: 0 });
  const [converting, setConverting] = useState(false);
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState<number | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const dismissError = useCallback(() => setError(null), []);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) =>
      ["image/png", "image/jpeg", "image/webp"].includes(f.type)
    );

    const newSketches: SketchFile[] = [];
    for (const file of fileArray) {
      const dataUrl = await readFileAsDataUrl(file);
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      newSketches.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: dataUrl,
        base64,
      });
    }

    setSketches((prev) => [...prev, ...newSketches]);
  };

  const handleRefFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) =>
      ["image/png", "image/jpeg", "image/webp"].includes(f.type)
    );

    const newRefs: ReferenceImage[] = [];
    for (const file of fileArray) {
      const dataUrl = await readFileAsDataUrl(file);
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      newRefs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: dataUrl,
        base64,
        characterName: file.name.replace(/\.\w+$/, ""),
      });
    }

    setReferenceImages((prev) => [...prev, ...newRefs]);
  };

  const removeSketch = (id: string) => {
    setSketches((prev) => prev.filter((s) => s.id !== id));
  };

  const removeReference = (id: string) => {
    setReferenceImages((prev) => prev.filter((r) => r.id !== id));
  };

  const updateReferenceName = (id: string, name: string) => {
    setReferenceImages((prev) =>
      prev.map((r) => (r.id === id ? { ...r, characterName: name } : r))
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleConvert = async () => {
    if (sketches.length === 0) return;
    setError(null);
    setConverting(true);
    setExtractedCharacters([]);
    setSetteiSheets([]);
    setSetteiProgress({ done: 0, total: 0 });
    setCurrentPhase(autoExtract ? "extracting" : "converting");
    setConvertedImages(
      sketches.map((_, i) => ({
        index: i,
        imageDataUrl: "",
        status: "pending" as const,
      }))
    );

    // Build reference_images dict: name -> base64
    const refImagesDict: Record<string, string> = {};
    for (const ref of referenceImages) {
      if (ref.characterName.trim()) {
        refImagesDict[ref.characterName.trim()] = ref.base64;
      }
    }

    try {
      const token = await getToken();
      abortRef.current = new AbortController();

      const res = await fetch(`${BACKEND_URL}/api/generate/sketch-to-manga`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sketch_images: sketches.map((s) => s.base64),
          style_hint: styleHint,
          genre,
          include_dialogue: includeDialogue,
          dialogue_hints: dialogueHints,
          auto_extract: autoExtract,
          reference_images: refImagesDict,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let setteiCount = 0;
      let setteiTotal = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);

          if (payload === "[DONE]") {
            setCurrentPhase("done");
            break;
          }

          try {
            const event = JSON.parse(payload) as {
              phase: string;
              characters?: ExtractedCharacter[] | null;
              character_name?: string | null;
              settei_base64?: string | null;
              image_index?: number | null;
              image_base64?: string | null;
              status: string;
              error_message?: string;
            };

            if (event.phase === "extract") {
              if (event.status === "complete" && event.characters) {
                setExtractedCharacters(event.characters);
                // Count how many need settei (not covered by user refs)
                const userRefNamesLower = new Set(
                  Object.keys(refImagesDict).map((n) => n.toLowerCase())
                );
                const needSettei = event.characters.filter(
                  (c) => !userRefNamesLower.has(c.name.toLowerCase())
                );
                setteiTotal = needSettei.length + Object.keys(refImagesDict).length;
                setSetteiProgress({ done: 0, total: setteiTotal });
                setCurrentPhase("settei");
              } else if (event.status === "skipped") {
                // No extraction, jump to settei or convert
                if (Object.keys(refImagesDict).length > 0) {
                  setCurrentPhase("settei");
                } else {
                  setCurrentPhase("converting");
                  // Mark first sketch as generating
                  setConvertedImages((prev) =>
                    prev.map((img, i) =>
                      i === 0 ? { ...img, status: "generating" as const } : img
                    )
                  );
                }
              } else if (event.status === "error") {
                setError(`Character extraction failed: ${event.error_message}`);
                setCurrentPhase("settei");
              }
            } else if (event.phase === "settei") {
              setteiCount++;
              setSetteiProgress({ done: setteiCount, total: setteiTotal || setteiCount });
              if (event.status === "complete" && event.settei_base64 && event.character_name) {
                setSetteiSheets((prev) => [
                  ...prev,
                  {
                    characterName: event.character_name!,
                    imageDataUrl: `data:image/png;base64,${event.settei_base64}`,
                    source: "auto",
                  },
                ]);
              } else if (event.status === "error" && event.character_name) {
                setError(`Settei failed for ${event.character_name}: ${event.error_message}`);
              }
            } else if (event.phase === "convert") {
              // First convert event means we're in converting phase
              setCurrentPhase("converting");
              const idx = event.image_index ?? 0;

              setConvertedImages((prev) =>
                prev.map((img) => {
                  if (img.index === idx) {
                    return event.status === "complete"
                      ? {
                          ...img,
                          status: "complete" as const,
                          imageDataUrl: `data:image/png;base64,${event.image_base64}`,
                        }
                      : {
                          ...img,
                          status: "error" as const,
                          errorMessage: event.error_message,
                        };
                  }
                  // Mark next as generating
                  if (img.index === idx + 1 && img.status === "pending") {
                    return { ...img, status: "generating" as const };
                  }
                  return img;
                })
              );

              if (event.status === "error") {
                setError(`Failed: Sketch ${idx + 1}`);
              }
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setConverting(false);
      abortRef.current = null;
    }
  };

  const completedCount = convertedImages.filter(
    (img) => img.status === "complete"
  ).length;

  const buttonText = () => {
    if (!converting) return "CONVERT TO MANGA";
    switch (currentPhase) {
      case "extracting":
        return "ANALYZING CHARACTERS...";
      case "settei":
        return setteiProgress.total > 0
          ? `GENERATING SETTEI... (${setteiProgress.done}/${setteiProgress.total})`
          : "GENERATING SETTEI...";
      case "converting":
        return `CONVERTING... (${completedCount}/${sketches.length})`;
      default:
        return "PROCESSING...";
    }
  };

  return (
    <div className="flex" style={{ height: "calc(100vh - 49px)" }}>
      {/* Left sidebar */}
      <div className="w-80 border-r border-gray-800 p-4 overflow-y-auto flex-shrink-0 fade-up flex flex-col">
        <div className="mb-4">
          <h2
            className="text-xl font-black"
            style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
          >
            Sketch to Manga
          </h2>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            Upload rough sketches and convert them to polished manga pages with
            character consistency.
          </p>
        </div>

        {/* Drop zone — Sketches */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 hover:border-red-500/50 hover:bg-red-500/5 rounded-lg p-4 mb-4 cursor-pointer transition-all text-center"
        >
          <div className="text-gray-500 text-sm mb-1">
            Drop sketches here or click to upload
          </div>
          <div className="text-gray-600 text-xs">PNG, JPG, WEBP</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Sketch thumbnails */}
        {sketches.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {sketches.map((sketch) => (
              <div key={sketch.id} className="relative group">
                <img
                  src={sketch.previewUrl}
                  alt="Sketch"
                  className="w-full aspect-[2/3] object-cover rounded border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors"
                  onClick={() => setModalImage(sketch.previewUrl)}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSketch(sketch.id);
                  }}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Auto-Extract Characters toggle */}
        <div className="mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoExtract}
              onChange={(e) => setAutoExtract(e.target.checked)}
              className="accent-red-500"
            />
            <span
              className="text-xs text-gray-400 uppercase tracking-widest"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              Auto-Extract Characters
            </span>
          </label>
          <p className="text-gray-600 text-[10px] mt-0.5 ml-5">
            Analyze sketches to identify characters automatically
          </p>
        </div>

        {/* Reference Images upload */}
        <div className="mb-3">
          <label
            className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Reference Images (optional)
          </label>
          <div
            onClick={() => refInputRef.current?.click()}
            className="border border-dashed border-gray-700 hover:border-red-500/50 hover:bg-red-500/5 rounded p-2 mb-2 cursor-pointer transition-all text-center"
          >
            <div className="text-gray-600 text-[10px]">
              Upload character references (settei)
            </div>
            <input
              ref={refInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleRefFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {referenceImages.length > 0 && (
            <div className="space-y-2 mb-2">
              {referenceImages.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center gap-2 bg-gray-900 rounded p-1.5"
                >
                  <img
                    src={ref.previewUrl}
                    alt="Reference"
                    className="w-8 h-8 object-cover rounded flex-shrink-0 cursor-pointer hover:ring-1 hover:ring-gray-500 transition-all"
                    onClick={() => setModalImage(ref.previewUrl)}
                  />
                  <input
                    type="text"
                    value={ref.characterName}
                    onChange={(e) =>
                      updateReferenceName(ref.id, e.target.value)
                    }
                    placeholder="Character name"
                    className="flex-1 bg-transparent border-b border-gray-700 text-xs text-white placeholder-gray-600 focus:border-red-500 outline-none py-0.5"
                  />
                  <button
                    onClick={() => removeReference(ref.id)}
                    className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Genre */}
        <div className="mb-3">
          <label
            className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Genre
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {genres.map((g) => (
              <button
                key={g.id}
                onClick={() => setGenre(g.id)}
                className={`py-1.5 px-2 rounded border text-xs transition-all ${
                  genre === g.id
                    ? "border-red-500 text-white bg-red-500/10"
                    : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style hint */}
        <div className="mb-3">
          <label
            className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Style Hint (optional)
          </label>
          <input
            type="text"
            value={styleHint}
            onChange={(e) => setStyleHint(e.target.value)}
            placeholder="e.g. detailed screentone, bold lines"
            className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:border-red-500 transition-colors"
          />
        </div>

        {/* Dialogue */}
        <div className="mb-4">
          <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDialogue}
              onChange={(e) => setIncludeDialogue(e.target.checked)}
              className="accent-red-500"
            />
            <span
              className="text-xs text-gray-400 uppercase tracking-widest"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              Include Dialogue
            </span>
          </label>
          {includeDialogue && (
            <textarea
              value={dialogueHints}
              onChange={(e) => setDialogueHints(e.target.value)}
              placeholder="Dialogue text for speech bubbles..."
              className="w-full h-16 bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 resize-none focus:border-red-500 transition-colors"
            />
          )}
        </div>

        {/* Convert button */}
        <button
          onClick={handleConvert}
          disabled={converting || sketches.length === 0}
          className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-xs tracking-wide"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          {buttonText()}
        </button>
      </div>

      {/* Right canvas area */}
      <div className="flex-1 screentone overflow-y-auto p-8">
        {convertedImages.length === 0 &&
        extractedCharacters.length === 0 &&
        setteiSheets.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div
              className="text-center fade-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div
                className="text-8xl font-black opacity-5 mb-4"
                style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
              >
                {"\u30B9\u30B1\u30C3\u30C1"}
              </div>
              <div className="text-gray-600 text-sm max-w-sm mx-auto leading-relaxed">
                Upload rough sketches on the left and convert them to polished
                manga pages with character consistency.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8">
            {/* Extracted characters panel */}
            {extractedCharacters.length > 0 && (
              <div className="w-full max-w-3xl">
                <h3
                  className="text-xs text-gray-400 uppercase tracking-widest mb-3"
                  style={{ fontFamily: "var(--font-space-mono), monospace" }}
                >
                  Extracted Characters ({extractedCharacters.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {extractedCharacters.map((char, i) => (
                    <div
                      key={i}
                      className="bg-gray-900/80 border border-gray-700 rounded-lg p-3"
                    >
                      <div className="text-sm font-bold text-white mb-0.5">
                        {char.name}
                      </div>
                      <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1">
                        {char.role}
                      </div>
                      <div className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">
                        {char.visual_description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settei thumbnails strip */}
            {setteiSheets.length > 0 && (
              <div className="w-full max-w-3xl">
                <h3
                  className="text-xs text-gray-400 uppercase tracking-widest mb-3"
                  style={{ fontFamily: "var(--font-space-mono), monospace" }}
                >
                  Character Settei ({setteiSheets.length})
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {setteiSheets.map((sheet, i) => (
                    <div key={i} className="flex-shrink-0 w-48">
                      <div className="text-[10px] text-gray-500 mb-1 text-center truncate">
                        {sheet.characterName}
                      </div>
                      <img
                        src={sheet.imageDataUrl}
                        alt={`Settei: ${sheet.characterName}`}
                        className="w-full rounded border border-gray-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Converted pages */}
            {convertedImages.length > 0 && (
              <div className="w-full flex flex-col items-center gap-8">
                {convertedImages.map((img, i) => (
                  <div key={i} className="w-full max-w-2xl">
                    {/* Before/after toggle */}
                    {img.status === "complete" && (
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() =>
                            setShowComparison(showComparison === i ? null : i)
                          }
                          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                          style={{
                            fontFamily: "var(--font-space-mono), monospace",
                          }}
                        >
                          {showComparison === i
                            ? "HIDE ORIGINAL"
                            : "SHOW ORIGINAL"}
                        </button>
                      </div>
                    )}

                    <div
                      className={`flex gap-4 ${showComparison === i ? "" : "justify-center"}`}
                    >
                      {/* Original sketch (comparison mode) */}
                      {showComparison === i && sketches[i] && (
                        <div className="flex-1 max-w-sm">
                          <div className="text-[10px] text-gray-600 mb-1 uppercase tracking-widest text-center">
                            Original
                          </div>
                          <img
                            src={sketches[i].previewUrl}
                            alt={`Original sketch ${i + 1}`}
                            className="w-full rounded border border-gray-700"
                          />
                        </div>
                      )}

                      {/* Converted result */}
                      <div
                        className={
                          showComparison === i
                            ? "flex-1 max-w-sm"
                            : "w-full max-w-lg"
                        }
                      >
                        {img.status === "complete" && showComparison === i && (
                          <div className="text-[10px] text-gray-600 mb-1 uppercase tracking-widest text-center">
                            Converted
                          </div>
                        )}
                        <div
                          className="bg-white rounded shadow-2xl overflow-hidden"
                          style={{ aspectRatio: "2/3" }}
                        >
                          {img.status === "complete" && img.imageDataUrl ? (
                            <img
                              src={img.imageDataUrl}
                              alt={`Converted manga ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : img.status === "generating" ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                              <div className="w-8 h-8 border-2 border-gray-400 border-t-red-500 rounded-full animate-spin mb-3" />
                              <span className="text-sm text-gray-400">
                                Converting sketch {i + 1}...
                              </span>
                            </div>
                          ) : img.status === "error" ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 p-4">
                              <span className="text-red-400 text-sm font-bold mb-2">
                                Error
                              </span>
                              <span className="text-xs text-red-300 text-center">
                                {img.errorMessage ?? "Conversion failed"}
                              </span>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <span className="text-gray-400 text-sm">
                                Sketch {i + 1}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image modal */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={modalImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setModalImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gray-900 border border-gray-700 text-white text-sm flex items-center justify-center hover:bg-gray-800 transition-colors"
            >
              x
            </button>
          </div>
        </div>
      )}

      <Toast message={error} onDismiss={dismissError} />
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
