"use client";

import { useState, useCallback } from "react";
import { useManga } from "@/contexts/MangaContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { getRandomStoryIdea } from "@/lib/storyPrompts";
import Toast from "@/components/Toast";
import CharactersStep from "@/components/CharactersStep";
import StoryboardStep from "@/components/StoryboardStep";
import ReaderStep from "@/components/ReaderStep";
import type { StoryResponse } from "@/contexts/MangaContext";

const genres = [
  { id: "shonen", label: "少年 Shōnen", desc: "Action & adventure" },
  { id: "shoujo", label: "少女 Shōjo", desc: "Romance & emotion" },
  { id: "seinen", label: "青年 Seinen", desc: "Mature & complex" },
  { id: "kodomo", label: "子供 Kodomo", desc: "Light & playful" },
];

const pageCounts = [4, 8, 12];
const MIN_PROMPT_LENGTH = 20;

export default function ConceptPage() {
  const {
    genre,
    setGenre,
    prompt,
    setPrompt,
    pageCount,
    setPageCount,
    generating,
    setGenerating,
    story,
    setStory,
    currentStep,
    completeStep,
    setCurrentStep,
  } = useManga();
  const { getToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const dismissError = useCallback(() => setError(null), []);

  const canGenerate = prompt.trim().length >= MIN_PROMPT_LENGTH && !generating;

  const handleRandom = () => {
    const idea = getRandomStoryIdea();
    setGenre(idea.genre);
    setPrompt(idea.prompt);
    setPageCount([4, 8, 12][Math.floor(Math.random() * 3)]);
    console.log("[concept] Random idea selected:", idea.genre);
  };

  const handleGenerate = async () => {
    console.log("[concept] Generate clicked", { genre, promptLen: prompt.length, pageCount });
    if (!canGenerate) {
      console.log("[concept] Blocked — prompt too short or already generating");
      return;
    }
    setError(null);
    setGenerating(true);

    try {
      console.log("[concept] Getting auth token...");
      const token = await getToken();
      console.log("[concept] Token acquired, calling API...");

      const data = await apiFetch<StoryResponse>("/api/generate/story", {
        method: "POST",
        body: { genre, prompt, page_count: pageCount },
        token,
      });

      console.log("[concept] Story received:", data.title, `(${data.characters.length} chars, ${data.pages.length} pages)`);
      setStory(data);
      completeStep("concept");
      setCurrentStep("characters");
      console.log("[concept] Advanced to characters step");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      console.error("[concept] Generation failed:", msg);
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  // Step-based rendering: show concept form, or completed summary for other steps
  const showForm = currentStep === "concept";

  if (currentStep === "characters") {
    return <CharactersStep />;
  }

  if (currentStep === "storyboard") {
    return <StoryboardStep />;
  }

  if (currentStep === "reader") {
    return <ReaderStep />;
  }

  if (currentStep !== "concept") {
    return (
      <div className="flex" style={{ height: "calc(100vh - 49px)" }}>
        <div className="flex-1 screentone flex items-center justify-center p-8">
          <div className="text-gray-600 text-sm">
            Step {currentStep} — coming soon
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex" style={{ height: "calc(100vh - 49px)" }}>
      {/* Left panel */}
      <div className="w-96 border-r border-gray-800 p-6 overflow-y-auto flex-shrink-0 fade-up">
        <div className="mb-6">
          <div
            className="text-xs text-gray-500 uppercase tracking-widest mb-1"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Step 01
          </div>
          <h2
            className="text-2xl font-black"
            style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
          >
            Story Concept
          </h2>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Describe your manga idea. A few sentences is all it takes — Gemini
            handles the rest.
          </p>
        </div>

        <button
          onClick={handleRandom}
          disabled={generating}
          className="w-full mb-5 py-2.5 rounded-lg border-2 border-dashed border-gray-700 hover:border-red-500/50 hover:bg-red-500/5 text-sm text-gray-400 hover:text-red-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          <span className="text-base">🎲</span> RANDOM IDEA
        </button>

        {/* Genre selector */}
        <div className="mb-5">
          <label
            className="text-xs text-gray-400 uppercase tracking-widest mb-2 block"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Genre
          </label>
          <div className="grid grid-cols-2 gap-2">
            {genres.map((g) => (
              <button
                key={g.id}
                onClick={() => setGenre(g.id)}
                className={`p-2.5 rounded border-2 text-left transition-all ${
                  genre === g.id
                    ? "border-red-500 bg-red-500 bg-opacity-10"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div
                  className="text-sm font-bold"
                  style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
                >
                  {g.label}
                </div>
                <div className="text-xs text-gray-500">{g.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Story prompt */}
        <div className="mb-5">
          <label
            className="text-xs text-gray-400 uppercase tracking-widest mb-2 block"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Your Story
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A high school student discovers they can pause time, but each pause ages them by one year..."
            className="w-full h-36 bg-gray-900 border-2 border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 resize-none focus:border-red-500 transition-colors"
          />
          <div className="flex justify-between text-xs mt-1">
            {prompt.trim().length > 0 && prompt.trim().length < MIN_PROMPT_LENGTH ? (
              <span className="text-red-400">
                {MIN_PROMPT_LENGTH - prompt.trim().length} more chars needed
              </span>
            ) : (
              <span />
            )}
            <span className="text-gray-600">{prompt.length} chars</span>
          </div>
        </div>

        {/* Page count */}
        <div className="mb-6">
          <label
            className="text-xs text-gray-400 uppercase tracking-widest mb-2 block"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Length
          </label>
          <div className="flex gap-2">
            {pageCounts.map((n) => (
              <button
                key={n}
                onClick={() => setPageCount(n)}
                className={`flex-1 py-2 rounded border-2 text-sm transition-all ${
                  pageCount === n
                    ? "border-red-500 text-white bg-red-500/10"
                    : "border-gray-700 text-gray-300 hover:border-gray-500"
                }`}
              >
                {n} Pages
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-sm tracking-wide"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          {generating ? "GENERATING..." : "GENERATE STORY →"}
        </button>
      </div>

      {/* Right preview area */}
      <div className="flex-1 screentone flex items-center justify-center p-8 overflow-y-auto">
        {generating ? (
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
              執筆中
            </div>
            <div className="text-gray-500 text-sm mt-3">
              Generating your manga script...
            </div>
          </div>
        ) : story ? (
          <div className="max-w-lg w-full fade-up">
            <div
              className="text-4xl font-black mb-1"
              style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
            >
              {story.title}
            </div>
            <div
              className="text-lg text-gray-500 mb-4"
              style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
            >
              {story.title_japanese}
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {story.synopsis}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-500">
                  {story.characters.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Characters</div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-500">
                  {story.pages.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Pages</div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-500">
                  {story.pages.reduce((sum, p) => sum + p.panels.length, 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Panels</div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="text-center fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div
              className="text-8xl font-black opacity-5 mb-4"
              style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
            >
              漫画
            </div>
            <div className="text-gray-600 text-sm max-w-sm mx-auto leading-relaxed">
              Your manga will appear here. Start by describing your story
              concept on the left.
            </div>
          </div>
        )}
      </div>

      <Toast message={error} onDismiss={dismissError} />
    </div>
  );
}
