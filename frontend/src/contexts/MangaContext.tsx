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

export interface PanelImage {
  pageNumber: number;
  panelNumber: number;
  imageDataUrl: string;
  status: "pending" | "generating" | "complete" | "error";
  errorMessage?: string;
}

export type Step = "concept" | "characters" | "storyboard" | "reader";

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
  panelImages: Map<string, PanelImage>;
  generatingPanels: boolean;
  setGeneratingPanels: (g: boolean) => void;
  updatePanelImage: (key: string, partial: Partial<PanelImage>) => void;
  clearPanelImages: () => void;
}

const MangaContext = createContext<MangaContextValue | null>(null);

export function MangaProvider({ children }: { children: ReactNode }) {
  const [genre, setGenre] = useState("shonen");
  const [prompt, setPrompt] = useState("");
  const [pageCount, setPageCount] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [story, setStory] = useState<StoryResponse | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("concept");
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());
  const [characterSheets, setCharacterSheets] = useState<Map<string, CharacterSheet>>(new Map());
  const [generatingSheets, setGeneratingSheets] = useState(false);
  const [panelImages, setPanelImages] = useState<Map<string, PanelImage>>(new Map());
  const [generatingPanels, setGeneratingPanels] = useState(false);

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

  const updatePanelImage = useCallback((key: string, partial: Partial<PanelImage>) => {
    setPanelImages((prev) => {
      const next = new Map(prev);
      const existing = next.get(key) ?? { pageNumber: 0, panelNumber: 0, imageDataUrl: "", status: "pending" as const };
      next.set(key, { ...existing, ...partial });
      return next;
    });
  }, []);

  const clearPanelImages = useCallback(() => {
    setPanelImages(new Map());
  }, []);

  const completeStep = (step: Step) => {
    setCompletedSteps((prev) => new Set(prev).add(step));
  };

  const resetProject = () => {
    setGenre("shonen");
    setPrompt("");
    setPageCount(4);
    setGenerating(false);
    setStory(null);
    setCurrentStep("concept");
    setCompletedSteps(new Set());
    setCharacterSheets(new Map());
    setGeneratingSheets(false);
    setPanelImages(new Map());
    setGeneratingPanels(false);
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
        panelImages,
        generatingPanels,
        setGeneratingPanels,
        updatePanelImage,
        clearPanelImages,
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
