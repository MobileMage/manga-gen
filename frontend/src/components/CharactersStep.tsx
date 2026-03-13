"use client";

import { useState, useCallback, useRef } from "react";
import { useManga, type CharacterSheet } from "@/contexts/MangaContext";
import { useAuth } from "@/contexts/AuthContext";
import Toast from "@/components/Toast";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export default function CharactersStep() {
  const {
    story,
    characterSheets,
    generatingSheets,
    setGeneratingSheets,
    updateCharacterSheet,
    completeStep,
    setCurrentStep,
  } = useManga();
  const { getToken } = useAuth();

  const [selectedCharacter, setSelectedCharacter] = useState<string>(
    story?.characters[0]?.name ?? ""
  );
  const [editedDescriptions, setEditedDescriptions] = useState<
    Record<string, string>
  >(() => {
    const init: Record<string, string> = {};
    story?.characters.forEach((c) => {
      init[c.name] = c.visual_description;
    });
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const dismissError = useCallback(() => setError(null), []);
  const abortRef = useRef<AbortController | null>(null);

  const characters = story?.characters ?? [];

  const allComplete = characters.length > 0 && characters.every(
    (c) => characterSheets.get(c.name)?.status === "complete"
  );

  const completedCount = characters.filter(
    (c) => characterSheets.get(c.name)?.status === "complete"
  ).length;

  const handleGenerate = async (singleCharacterName?: string) => {
    setError(null);

    const charsToGenerate = singleCharacterName
      ? characters.filter((c) => c.name === singleCharacterName)
      : characters;

    if (charsToGenerate.length === 0) return;

    // Mark characters as generating
    charsToGenerate.forEach((c) => {
      updateCharacterSheet(c.name, { status: "generating", errorMessage: undefined });
    });

    if (!singleCharacterName) setGeneratingSheets(true);

    try {
      const token = await getToken();

      // Build request body with edited descriptions
      const requestChars = charsToGenerate.map((c) => ({
        name: c.name,
        role: c.role,
        visual_description: editedDescriptions[c.name] ?? c.visual_description,
        personality: c.personality,
      }));

      const styleHint = story
        ? `Manga style, genre: ${story.title}`
        : "Manga style";

      abortRef.current = new AbortController();

      const res = await fetch(`${BACKEND_URL}/api/generate/character-sheets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          characters: requestChars,
          style_hint: styleHint,
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

          if (payload === "[DONE]") break;

          try {
            const event = JSON.parse(payload) as {
              character_name: string;
              image_base64: string;
              status: string;
              error_message: string;
            };

            if (event.status === "complete") {
              updateCharacterSheet(event.character_name, {
                status: "complete",
                imageDataUrl: `data:image/png;base64,${event.image_base64}`,
                errorMessage: undefined,
              });
              // Auto-select first completed character
              setSelectedCharacter((prev) => {
                const prevSheet = characterSheets.get(prev);
                if (!prevSheet || prevSheet.status !== "complete") {
                  return event.character_name;
                }
                return prev;
              });
            } else {
              updateCharacterSheet(event.character_name, {
                status: "error",
                errorMessage: event.error_message,
              });
              setError(`Failed to generate sheet for ${event.character_name}`);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      // Mark remaining generating chars as error
      charsToGenerate.forEach((c) => {
        const sheet = characterSheets.get(c.name);
        if (sheet?.status === "generating") {
          updateCharacterSheet(c.name, { status: "error", errorMessage: msg });
        }
      });
    } finally {
      setGeneratingSheets(false);
      abortRef.current = null;
    }
  };

  const handleContinue = () => {
    completeStep("characters");
    setCurrentStep("storyboard");
  };

  const selectedSheet = characterSheets.get(selectedCharacter);

  // Find first complete sheet for auto-selecting in thumbnail strip
  const completedSheets = characters
    .map((c) => ({ name: c.name, sheet: characterSheets.get(c.name) }))
    .filter((x): x is { name: string; sheet: CharacterSheet } =>
      x.sheet?.status === "complete"
    );

  return (
    <div className="flex" style={{ height: "calc(100vh - 49px)" }}>
      {/* Left panel */}
      <div className="w-96 border-r border-gray-800 p-6 overflow-y-auto flex-shrink-0 fade-up">
        <div className="mb-6">
          <div
            className="text-xs text-gray-500 uppercase tracking-widest mb-1"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Step 02
          </div>
          <h2
            className="text-2xl font-black"
            style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
          >
            Characters
          </h2>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Review and edit character descriptions, then generate settei (model
            sheets) for each character.
          </p>
        </div>

        {/* Character cards */}
        <div className="space-y-3 mb-5">
          {characters.map((c) => {
            const sheet = characterSheets.get(c.name);
            const isActive = selectedCharacter === c.name;
            const status = sheet?.status ?? "pending";

            return (
              <div
                key={c.name}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCharacter(c.name)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedCharacter(c.name); }}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-red-500 bg-red-500/5"
                    : "border-gray-800 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {c.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 uppercase">
                      {c.role}
                    </span>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      status === "complete"
                        ? "bg-green-500"
                        : status === "generating"
                          ? "bg-yellow-500 animate-pulse"
                          : status === "error"
                            ? "bg-red-500"
                            : "bg-gray-600"
                    }`}
                  />
                </div>
                <div className="text-xs text-gray-500 line-clamp-2">
                  {editedDescriptions[c.name] ?? c.visual_description}
                </div>

                {/* Per-character regenerate/retry */}
                {(status === "complete" || status === "error") && (
                  <div
                    className="mt-2 flex justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleGenerate(c.name)}
                      disabled={generatingSheets}
                      className="text-[10px] px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-all disabled:opacity-40"
                      style={{
                        fontFamily: "var(--font-space-mono), monospace",
                      }}
                    >
                      {status === "error" ? "RETRY" : "REGENERATE"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Editable description for selected character */}
        {selectedCharacter && (
          <div className="mb-5">
            <label
              className="text-xs text-gray-400 uppercase tracking-widest mb-2 block"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              Visual Description
            </label>
            <textarea
              value={editedDescriptions[selectedCharacter] ?? ""}
              onChange={(e) =>
                setEditedDescriptions((prev) => ({
                  ...prev,
                  [selectedCharacter]: e.target.value,
                }))
              }
              className="w-full h-28 bg-gray-900 border-2 border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 resize-none focus:border-red-500 transition-colors"
            />
          </div>
        )}

        {/* Generate all button */}
        <button
          onClick={() => handleGenerate()}
          disabled={generatingSheets || characters.length === 0}
          className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-sm tracking-wide mb-3"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          {generatingSheets
            ? `GENERATING... (${completedCount}/${characters.length})`
            : "GENERATE SETTEI SHEETS"}
        </button>

        {/* Continue button */}
        {allComplete && (
          <button
            onClick={handleContinue}
            className="w-full py-3 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold rounded-lg transition-all text-sm tracking-wide fade-up"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            CONTINUE TO STORYBOARD &rarr;
          </button>
        )}
      </div>

      {/* Right preview area */}
      <div className="flex-1 screentone flex flex-col items-center justify-center p-8 overflow-y-auto">
        {generatingSheets && !selectedSheet?.imageDataUrl ? (
          /* Generating state */
          <div className="text-center fade-up">
            <div className="speed-lines mb-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="speed-line" />
              ))}
            </div>
            <div
              className="text-6xl font-black animate-pulse-kanji"
              style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
            >
              設定
            </div>
            <div className="text-gray-500 text-sm mt-3">
              Generating settei sheets... ({completedCount}/{characters.length})
            </div>
          </div>
        ) : selectedSheet?.status === "complete" && selectedSheet.imageDataUrl ? (
          /* Complete state — show selected character's sheet */
          <div className="w-full max-w-4xl fade-up flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedSheet.imageDataUrl}
              alt={`${selectedCharacter} settei sheet`}
              className="w-full rounded-lg border border-gray-800 mb-4"
            />

            {/* Thumbnail strip */}
            {completedSheets.length > 1 && (
              <div className="flex gap-2 mt-2">
                {completedSheets.map(({ name, sheet }) => (
                  <button
                    key={name}
                    onClick={() => setSelectedCharacter(name)}
                    className={`w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                      name === selectedCharacter
                        ? "border-red-500"
                        : "border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sheet.imageDataUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Idle state */
          <div
            className="text-center fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div
              className="text-8xl font-black opacity-5 mb-4"
              style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
            >
              設定
            </div>
            <div className="text-gray-600 text-sm max-w-sm mx-auto leading-relaxed">
              Character model sheets will appear here. Edit descriptions on the
              left, then generate settei sheets.
            </div>
          </div>
        )}
      </div>

      <Toast message={error} onDismiss={dismissError} />
    </div>
  );
}
