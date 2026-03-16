"use client";

import { useEffect, useRef, useCallback } from "react";
import { useManga } from "@/contexts/MangaContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  generateStory,
  generateCharacterSheets,
  generatePages,
} from "@/lib/generatePipeline";

type AutoStep = "idle" | "story" | "characters" | "pages" | "done";

export function useAutoMode() {
  const ctx = useManga();
  const { getToken } = useAuth();
  const runningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoStepRef = useRef<AutoStep>("idle");

  const {
    autoMode,
    autoPaused,
    setAutoPaused,
    setAutoMode,
    genre,
    prompt,
    pageCount,
    story,
    setStory,
    setGenerating,
    generating,
    characterSheets,
    generatingSheets,
    setGeneratingSheets,
    updateCharacterSheet,
    clearCharacterSheets,
    pageImages,
    generatingPages,
    setGeneratingPages,
    updatePageImage,
    clearPageImages,
    currentStep,
    setCurrentStep,
    completeStep,
    completedSteps,
  } = ctx;

  const stopAutoMode = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    runningRef.current = false;
    autoStepRef.current = "idle";
  }, []);

  // Main auto-mode orchestrator
  useEffect(() => {
    if (!autoMode || autoPaused || runningRef.current) return;

    const runNext = async () => {
      // Determine what to do next based on current state
      const hasStory = !!story;
      const allSheetsComplete =
        hasStory &&
        story.characters.length > 0 &&
        story.characters.every(
          (c) => characterSheets.get(c.name)?.status === "complete"
        );
      const allPagesComplete =
        hasStory &&
        story.pages.length > 0 &&
        story.pages.every(
          (p) => pageImages.get(p.page_number)?.status === "complete"
        );

      // Already generating something — wait for it to finish
      if (generating || generatingSheets || generatingPages) return;

      // All done
      if (allPagesComplete) {
        if (currentStep !== "reader") {
          completeStep("storyboard");
          setCurrentStep("reader");
        }
        setAutoMode(false);
        autoStepRef.current = "done";
        runningRef.current = false;
        return;
      }

      runningRef.current = true;

      try {
        const token = await getToken();
        abortRef.current = new AbortController();
        const signal = abortRef.current.signal;

        // Step 1: Generate story if not yet generated
        if (!hasStory && prompt.trim().length >= 20) {
          autoStepRef.current = "story";
          setGenerating(true);

          try {
            const data = await generateStory({
              genre,
              prompt,
              pageCount,
              token,
              signal,
            });
            setStory(data);
            completeStep("concept");
            setCurrentStep("characters");
          } finally {
            setGenerating(false);
          }

          runningRef.current = false;
          return; // Let the effect re-trigger for next step
        }

        // Step 2: Generate character sheets
        if (hasStory && !allSheetsComplete && !completedSteps.has("characters")) {
          autoStepRef.current = "characters";

          if (currentStep !== "characters") {
            setCurrentStep("characters");
          }

          // Mark characters as generating
          story.characters.forEach((c) => {
            updateCharacterSheet(c.name, { status: "generating", errorMessage: undefined });
          });
          setGeneratingSheets(true);

          try {
            await generateCharacterSheets({
              characters: story.characters,
              storyTitle: story.title,
              token,
              signal,
              callbacks: {
                onSheetComplete: (name, imageDataUrl) => {
                  updateCharacterSheet(name, {
                    status: "complete",
                    imageDataUrl,
                    errorMessage: undefined,
                  });
                },
                onSheetError: (name, errorMessage) => {
                  updateCharacterSheet(name, { status: "error", errorMessage });
                },
              },
            });

            completeStep("characters");
          } finally {
            setGeneratingSheets(false);
          }

          runningRef.current = false;
          return;
        }

        // Step 3: Generate pages
        if (hasStory && allSheetsComplete && !allPagesComplete) {
          autoStepRef.current = "pages";

          if (currentStep !== "storyboard") {
            completeStep("characters");
            setCurrentStep("storyboard");
          }

          // Mark all pages as pending, first as generating
          clearPageImages();
          for (const page of story.pages) {
            updatePageImage(page.page_number, {
              pageNumber: page.page_number,
              status: "pending",
              imageDataUrl: "",
              errorMessage: undefined,
            });
          }
          if (story.pages[0]) {
            updatePageImage(story.pages[0].page_number, { status: "generating" });
          }
          setGeneratingPages(true);

          // Track completion locally — React state is stale inside the closure
          let completedCount = 0;
          let anyError = false;
          const expectedCount = story.pages.length;

          try {
            await generatePages({
              story,
              characterSheets,
              genre,
              token,
              signal,
              callbacks: {
                onPageComplete: (pageNumber, imageDataUrl) => {
                  updatePageImage(pageNumber, {
                    status: "complete",
                    imageDataUrl,
                    errorMessage: undefined,
                  });
                  completedCount++;
                },
                onPageError: (pageNumber, errorMessage) => {
                  updatePageImage(pageNumber, { status: "error", errorMessage });
                  anyError = true;
                },
                onPageGenerating: (pageNumber) => {
                  updatePageImage(pageNumber, { status: "generating" });
                },
              },
            });

            // Only advance to reader if every page actually completed.
            // A dropped SSE connection (proxy timeout during retry backoff) resolves
            // the stream without error events, so we also guard on completedCount.
            if (!anyError && completedCount === expectedCount) {
              completeStep("storyboard");
              setCurrentStep("reader");
              setAutoMode(false);
              autoStepRef.current = "done";
            } else {
              // Partial completion or connection drop — pause so the user can retry
              setAutoPaused(true);
            }
          } finally {
            setGeneratingPages(false);
          }

          runningRef.current = false;
          return;
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        console.error("[auto-mode] Error:", e);
        // Pause on error so user can fix and resume
        setAutoPaused(true);
      } finally {
        runningRef.current = false;
        abortRef.current = null;
      }
    };

    runNext();
  }, [
    autoMode,
    autoPaused,
    story,
    characterSheets,
    pageImages,
    generating,
    generatingSheets,
    generatingPages,
    currentStep,
    completedSteps,
    genre,
    prompt,
    pageCount,
    getToken,
    setStory,
    setGenerating,
    setGeneratingSheets,
    setGeneratingPages,
    updateCharacterSheet,
    clearCharacterSheets,
    updatePageImage,
    clearPageImages,
    setCurrentStep,
    completeStep,
    setAutoMode,
    setAutoPaused,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoMode();
    };
  }, [stopAutoMode]);

  return {
    autoStep: autoStepRef.current,
    stopAutoMode,
  };
}
