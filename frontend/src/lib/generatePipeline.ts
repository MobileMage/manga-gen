import type {
  Character,
  CharacterSheet,
  PageImage,
  PageScript,
  StoryResponse,
} from "@/contexts/MangaContext";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

// ── Story Generation ───────────────────────────────────────────────────

export async function generateStory(params: {
  genre: string;
  prompt: string;
  pageCount: number;
  token: string;
  signal?: AbortSignal;
}): Promise<StoryResponse> {
  const { genre, prompt, pageCount, token, signal } = params;

  const res = await fetch(`${BACKEND_URL}/api/generate/story`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ genre, prompt, page_count: pageCount }),
    signal,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? JSON.stringify(body);
    } catch {
      message = await res.text().catch(() => message);
    }
    throw new Error(message);
  }

  return (await res.json()) as StoryResponse;
}

// ── Character Sheet Generation (SSE stream) ────────────────────────────

export interface CharacterSheetCallbacks {
  onSheetComplete: (name: string, imageDataUrl: string) => void;
  onSheetError: (name: string, errorMessage: string) => void;
}

export async function generateCharacterSheets(params: {
  characters: Character[];
  editedDescriptions?: Record<string, string>;
  storyTitle?: string;
  token: string;
  signal?: AbortSignal;
  callbacks: CharacterSheetCallbacks;
}): Promise<void> {
  const { characters, editedDescriptions, storyTitle, token, signal, callbacks } = params;

  const requestChars = characters.map((c) => ({
    name: c.name,
    role: c.role,
    visual_description: editedDescriptions?.[c.name] ?? c.visual_description,
    personality: c.personality,
  }));

  const styleHint = storyTitle ? `Manga style, genre: ${storyTitle}` : "Manga style";

  const res = await fetch(`${BACKEND_URL}/api/generate/character-sheets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ characters: requestChars, style_hint: styleHint }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  await parseSSEStream(res, (event) => {
    if (event.status === "complete") {
      callbacks.onSheetComplete(
        event.character_name,
        `data:image/png;base64,${event.image_base64}`,
      );
    } else {
      callbacks.onSheetError(event.character_name, event.error_message);
    }
  });
}

// ── Page Generation (SSE stream) ────────────────────────────────────────

export interface PageGenerationCallbacks {
  onPageComplete: (pageNumber: number, imageDataUrl: string) => void;
  onPageError: (pageNumber: number, errorMessage: string) => void;
  onPageGenerating?: (pageNumber: number) => void;
}

export async function generatePages(params: {
  story: StoryResponse;
  characterSheets: Map<string, CharacterSheet>;
  genre: string;
  token: string;
  signal?: AbortSignal;
  callbacks: PageGenerationCallbacks;
}): Promise<void> {
  const { story, characterSheets, genre, token, signal, callbacks } = params;

  // Build character_sheets dict: name -> base64 (strip data URL prefix)
  const sheetsDict: Record<string, string> = {};
  characterSheets.forEach((sheet, name) => {
    if (sheet.status === "complete" && sheet.imageDataUrl) {
      sheetsDict[name] = sheet.imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
    }
  });

  const stylePrompt = `Manga style, ${genre} genre. Cinematic composition`;

  const res = await fetch(`${BACKEND_URL}/api/generate/pages-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      pages: story.pages,
      characters: story.characters,
      character_sheets: sheetsDict,
      genre,
      style_prompt: stylePrompt,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const pages = story.pages;

  await parseSSEStream(res, (event) => {
    if (event.status === "complete") {
      callbacks.onPageComplete(
        event.page_number,
        `data:image/png;base64,${event.image_base64}`,
      );
    } else {
      callbacks.onPageError(event.page_number, event.error_message);
    }

    // Mark next page as generating
    if (callbacks.onPageGenerating) {
      const pageIdx = pages.findIndex((p) => p.page_number === event.page_number);
      if (pageIdx >= 0 && pageIdx + 1 < pages.length) {
        callbacks.onPageGenerating(pages[pageIdx + 1].page_number);
      }
    }
  });
}

// ── SSE Parser ──────────────────────────────────────────────────────────

async function parseSSEStream(
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEvent: (event: any) => void,
): Promise<void> {
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
      if (payload === "[DONE]") return;

      try {
        const event = JSON.parse(payload);
        onEvent(event);
      } catch {
        // Skip malformed JSON lines
      }
    }
  }
}
