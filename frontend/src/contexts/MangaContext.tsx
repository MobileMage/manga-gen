"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface Character {
  name: string;
  role: string;
  visual_description: string;
  personality: string;
}

export interface PanelScript {
  panel_number: number;
  description: string;
  dialogue: string;
  characters_present: string[];
  mood: string;
}

export interface PageScript {
  page_number: number;
  panels: PanelScript[];
}

export interface StoryResponse {
  title: string;
  title_japanese: string;
  synopsis: string;
  characters: Character[];
  pages: PageScript[];
}

export interface CharacterSheet {
  characterName: string;
  imageDataUrl: string; // "data:image/png;base64,..."
  status: "pending" | "generating" | "complete" | "error";
  errorMessage?: string;
}

export interface PageImage {
  pageNumber: number;
  imageDataUrl: string;
  status: "pending" | "generating" | "complete" | "error";
  errorMessage?: string;
}

export type Step = "concept" | "characters" | "storyboard" | "reader";
export type AppMode = "story" | "sketch";

interface MangaContextValue {
  genre: string;
  setGenre: (g: string) => void;
  prompt: string;
  setPrompt: (p: string) => void;
  pageCount: number;
  setPageCount: (n: number) => void;
  generating: boolean;
  setGenerating: (g: boolean) => void;
  story: StoryResponse | null;
  setStory: (s: StoryResponse | null) => void;
  currentStep: Step;
  setCurrentStep: (s: Step) => void;
  completedSteps: Set<Step>;
  completeStep: (s: Step) => void;
  resetProject: () => void;
  characterSheets: Map<string, CharacterSheet>;
  generatingSheets: boolean;
  setGeneratingSheets: (g: boolean) => void;
  updateCharacterSheet: (name: string, partial: Partial<CharacterSheet>) => void;
  clearCharacterSheets: () => void;
  pageImages: Map<number, PageImage>;
  generatingPages: boolean;
  setGeneratingPages: (g: boolean) => void;
  updatePageImage: (pageNumber: number, partial: Partial<PageImage>) => void;
  clearPageImages: () => void;
  mode: AppMode;
  setMode: (m: AppMode) => void;
  autoMode: boolean;
  setAutoMode: (a: boolean) => void;
  autoPaused: boolean;
  setAutoPaused: (p: boolean) => void;
}

const MangaContext = createContext<MangaContextValue | null>(null);

export function MangaProvider({ children }: { children: ReactNode }) {
  const [genre, setGenre] = useState("shonen");
  const [prompt, setPrompt] = useState("");
  const [pageCount, setPageCount] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [story, setStory] = useState<StoryResponse | null>(null);
  const [currentStep, setCurrentStepRaw] = useState<Step>("concept");
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());
  const [characterSheets, setCharacterSheets] = useState<Map<string, CharacterSheet>>(new Map());
  const [generatingSheets, setGeneratingSheets] = useState(false);
  const [pageImages, setPageImages] = useState<Map<number, PageImage>>(new Map());
  const [generatingPages, setGeneratingPages] = useState(false);
  const [mode, setMode] = useState<AppMode>("story");
  const [autoMode, setAutoMode] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);

  const updateCharacterSheet = useCallback((name: string, partial: Partial<CharacterSheet>) => {
    setCharacterSheets((prev) => {
      const next = new Map(prev);
      const existing = next.get(name) ?? { characterName: name, imageDataUrl: "", status: "pending" as const };
      next.set(name, { ...existing, ...partial });
      return next;
    });
  }, []);

  const clearCharacterSheets = useCallback(() => {
    setCharacterSheets(new Map());
  }, []);

  const updatePageImage = useCallback((pageNumber: number, partial: Partial<PageImage>) => {
    setPageImages((prev) => {
      const next = new Map(prev);
      const existing = next.get(pageNumber) ?? { pageNumber, imageDataUrl: "", status: "pending" as const };
      next.set(pageNumber, { ...existing, ...partial });
      return next;
    });
  }, []);

  const clearPageImages = useCallback(() => {
    setPageImages(new Map());
  }, []);

  const setCurrentStep = (next: Step) => {
    // Mark the step we're leaving as completed so we can navigate back to it
    setCurrentStepRaw((prev) => {
      if (prev !== next) {
        setCompletedSteps((cs) => new Set(cs).add(prev));
      }
      return next;
    });
  };

  const completeStep = (step: Step) => {
    setCompletedSteps((prev) => new Set(prev).add(step));
  };

  const resetProject = () => {
    setGenre("shonen");
    setPrompt("");
    setPageCount(4);
    setGenerating(false);
    setStory(null);
    setCurrentStepRaw("concept");
    setCompletedSteps(new Set());
    setCharacterSheets(new Map());
    setGeneratingSheets(false);
    setPageImages(new Map());
    setGeneratingPages(false);
    setAutoMode(false);
    setAutoPaused(false);
  };

  return (
    <MangaContext.Provider
      value={{
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
        setCurrentStep,
        completedSteps,
        completeStep,
        resetProject,
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
        mode,
        setMode,
        autoMode,
        setAutoMode,
        autoPaused,
        setAutoPaused,
      }}
    >
      {children}
    </MangaContext.Provider>
  );
}

export function useManga() {
  const ctx = useContext(MangaContext);
  if (!ctx) throw new Error("useManga must be used within MangaProvider");
  return ctx;
}
