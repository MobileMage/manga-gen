import logging
import os
from google import genai
from google.genai.types import GenerateContentConfig, ImageConfig
from google.genai import types
from models.schemas import Character, CharacterExtractResponse, PageScript, PanelScript, StoryRequest, StoryResponse

logger = logging.getLogger("manga-gen.gemini")

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GOOGLE_API_KEY environment variable is not set")
        logger.info("[gemini] Initializing client")
        _client = genai.Client(api_key=api_key)
    return _client


SYSTEM_PROMPT = """You are a professional manga editor and story writer. Given a genre and story prompt, create a detailed manga script.

Requirements:
- Write compelling, genre-appropriate dialogue
- Provide detailed visual descriptions for every panel (camera angle, character poses, expressions, backgrounds, effects)
- Each page should have 3-6 panels
- Characters must have distinct visual descriptions suitable for manga illustration
- The story should have a clear beginning, rising action, and a hook or resolution appropriate for the page count
- Title should be creative and genre-fitting
- title_japanese should be the Japanese translation/adaptation of the title
- Synopsis should be 2-3 sentences summarizing the story"""


async def generate_story(request: StoryRequest) -> StoryResponse:
    client = _get_client()

    user_prompt = f"""Genre: {request.genre}
Story concept: {request.prompt}
Number of pages: {request.page_count}

Create a complete manga script with {request.page_count} pages."""

    logger.info(f"[gemini] Calling gemini-2.5-flash with {len(user_prompt)} char prompt")

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=StoryResponse,
        ),
    )

    logger.info(f"[gemini] Response received, text length={len(response.text)}")

    result = StoryResponse.model_validate_json(response.text)
    logger.info(f"[gemini] Parsed: title={result.title!r}")
    return result


CHARACTER_EXTRACT_SYSTEM_PROMPT = """You are a professional manga editor analyzing rough sketches/drawings.
Your job is to identify all distinct characters across the provided sketches.
For each character, provide:
- A descriptive name based on their appearance (e.g. "Spiky-haired Boy", "Girl with Glasses")
- Their apparent role (protagonist, antagonist, supporting, background)
- A detailed visual description covering: hair style/color, eye shape, body type, clothing, distinguishing features
- Personality inferred from their poses and expressions

Rules:
- Deduplicate characters that appear across multiple sketches (same character = same entry)
- Only include characters that are clearly depicted (not vague background figures)
- If no characters are identifiable, return an empty list"""


async def extract_characters_from_sketches(
    sketch_images: list[bytes],
    genre: str = "",
) -> CharacterExtractResponse:
    client = _get_client()

    contents: list[types.Part] = []
    total = len(sketch_images)
    for i, img_bytes in enumerate(sketch_images):
        contents.append(types.Part.from_bytes(data=img_bytes, mime_type="image/png"))
        contents.append(types.Part.from_text(text=f"[SKETCH PAGE {i + 1} of {total}]"))

    genre_hint = f" The genre is {genre}." if genre else ""
    contents.append(types.Part.from_text(
        text=f"Analyze all the sketches above. Identify every distinct character across all pages.{genre_hint} Return structured JSON with the character list."
    ))

    logger.info(f"[gemini] Extracting characters from {total} sketches")
    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config=genai.types.GenerateContentConfig(
            system_instruction=CHARACTER_EXTRACT_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=CharacterExtractResponse,
        ),
    )

    result = CharacterExtractResponse.model_validate_json(response.text)
    logger.info(f"[gemini] Extracted {len(result.characters)} characters")
    return result


SETTEI_SYSTEM_PROMPT = """You are a professional manga character designer specializing in settei (設定) / model sheets.
Create a clean, professional character model sheet with clear linework on a pure white background.
The sheet should look like an official anime production reference sheet."""

IMAGE_MODELS = [
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
    "gemini-2.5-flash-image",
]


async def generate_character_sheet(character: Character, style_hint: str) -> tuple[str, bytes]:
    client = _get_client()

    user_prompt = f"""Create a professional manga/anime settei (character model sheet) for:

Character: {character.name}
Role: {character.role}
Visual Description: {character.visual_description}
Personality: {character.personality}
Style: {style_hint}

Layout the sheet as follows:
- Top row: Three full-body views (front view, 3/4 angle view, side profile view) showing the complete character design
- Bottom row: Four expression close-ups showing different emotions (neutral, happy, angry, surprised)
- Clean black linework on white background
- Label each view/expression
- Include the character name at the top of the sheet"""

    last_error = None
    for model_name in IMAGE_MODELS:
        try:
            logger.info(f"[gemini] Generating settei for {character.name!r} with {model_name}")
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=GenerateContentConfig(
                    system_instruction=SETTEI_SYSTEM_PROMPT,
                    response_modalities=["IMAGE", "TEXT"],
                    image_config=ImageConfig(),
                ),
            )

            # Extract image bytes from response
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    logger.info(f"[gemini] Settei generated for {character.name!r}, size={len(part.inline_data.data)} bytes")
                    return (character.name, part.inline_data.data)

            raise RuntimeError(f"No image returned in response for {character.name}")

        except Exception as e:
            last_error = e
            logger.warning(f"[gemini] {model_name} failed for {character.name!r}: {e}")
            continue

    raise RuntimeError(f"All models failed for {character.name}: {last_error}")


async def generate_character_sheet_from_sketches(
    character: Character,
    style_hint: str,
    sketch_images: list[bytes],
) -> tuple[str, bytes]:
    """Generate a settei sheet using sketches as visual reference so it matches the artist's designs."""
    client = _get_client()

    contents: list[types.Part] = []

    # Pass sketches as visual reference first
    for i, img_bytes in enumerate(sketch_images):
        contents.append(types.Part.from_bytes(data=img_bytes, mime_type="image/png"))
        contents.append(types.Part.from_text(
            text=f"[REFERENCE SKETCH {i + 1}] Study the appearance of {character.name} in this sketch. Match the artist's design exactly.",
        ))

    user_prompt = f"""Create a professional manga/anime settei (character model sheet) for:

Character: {character.name}
Role: {character.role}
Visual Description: {character.visual_description}
Personality: {character.personality}
Style: {style_hint}

IMPORTANT: The reference sketches above show the artist's design for this character.
Match the artist's character design — hair, face shape, clothing, proportions — as closely as possible.

Layout the sheet as follows:
- Top row: Three full-body views (front view, 3/4 angle view, side profile view) showing the complete character design
- Bottom row: Four expression close-ups showing different emotions (neutral, happy, angry, surprised)
- Clean black linework on white background
- Label each view/expression
- Include the character name at the top of the sheet"""

    contents.append(types.Part.from_text(text=user_prompt))

    last_error = None
    for model_name in IMAGE_MODELS:
        try:
            logger.info(f"[gemini] Generating sketch-based settei for {character.name!r} with {model_name}")
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=GenerateContentConfig(
                    system_instruction=SETTEI_SYSTEM_PROMPT,
                    response_modalities=["IMAGE", "TEXT"],
                    image_config=ImageConfig(),
                ),
            )

            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    logger.info(f"[gemini] Sketch-based settei generated for {character.name!r}, size={len(part.inline_data.data)} bytes")
                    return (character.name, part.inline_data.data)

            raise RuntimeError(f"No image returned in response for {character.name}")

        except Exception as e:
            last_error = e
            logger.warning(f"[gemini] {model_name} failed for sketch-based settei {character.name!r}: {e}")
            continue

    raise RuntimeError(f"All models failed for sketch-based settei {character.name}: {last_error}")


PANEL_SYSTEM_PROMPT = """You are a professional manga panel artist working in a SINGLE CONSISTENT ART STYLE.

You are generating a SINGLE PANEL — ONE scene, ONE moment in time. Fill the ENTIRE image with the scene.

CRITICAL LAYOUT RULES:
- Do NOT draw panel borders, frames, or gutters
- Do NOT subdivide the image into multiple panels or sub-panels
- Do NOT create a comic page layout — this is ONE panel only
- The artwork must extend edge-to-edge, filling the entire image
- No white margins or borders around the edges

ART STYLE RULES (strictly enforced):
- Black and white ink artwork with screentone shading (no color, no grayscale wash)
- Clean, sharp linework in the style of classic Weekly Shonen Jump serialization
- Consistent line weight: thick outlines for characters, thin lines for details
- Screentone dots for shadows and mid-tones (not crosshatching, not stippling)
- High contrast: pure black shadows, pure white highlights
- Cinematic panel composition with dynamic camera angles
- Speech bubbles with hand-lettered style text when dialogue is provided

CHARACTER CONSISTENCY IS THE TOP PRIORITY:
- You are given reference settei (model sheets) for each character. Match their designs EXACTLY.
- Hair style, eye shape, body proportions, clothing details must be identical to the reference.
- When in doubt, refer back to the settei sheet — it is the ground truth."""


async def generate_panel(
    panel: PanelScript,
    page_number: int,
    character_sheets: dict[str, bytes],
    character_descriptions: dict[str, str],
    previous_panel_bytes: bytes | None,
    genre: str,
    style_prompt: str,
    aspect_ratio: str = "3:4",
) -> bytes:
    client = _get_client()

    # Build multimodal contents
    contents: list[types.Part] = []

    # ALWAYS pass ALL settei sheets as reference — non-negotiable for consistency.
    # Characters present in this panel are labeled as active, others as reference-only.
    present_set = set(panel.characters_present)
    for char_name, sheet_bytes in character_sheets.items():
        contents.append(types.Part.from_bytes(
            data=sheet_bytes,
            mime_type="image/png",
        ))
        if char_name in present_set:
            contents.append(types.Part.from_text(
                text=f"[CHARACTER REFERENCE — IN THIS PANEL] {char_name} — settei/model sheet above. This character APPEARS in this panel. Match this design EXACTLY.",
            ))
        else:
            contents.append(types.Part.from_text(
                text=f"[CHARACTER REFERENCE — NOT IN PANEL] {char_name} — settei/model sheet above. This character does NOT appear in this panel but is provided for style consistency.",
            ))

    # Add previous panel for visual continuity
    if previous_panel_bytes is not None:
        contents.append(types.Part.from_bytes(
            data=previous_panel_bytes,
            mime_type="image/png",
        ))
        contents.append(types.Part.from_text(
            text="[PREVIOUS PANEL] The panel above is the previous panel on this page. Maintain visual continuity in art style, character proportions, and environment.",
        ))

    # Build the scene prompt — include FULL text descriptions of every character (belt and suspenders)
    character_detail_lines = []
    for char_name in panel.characters_present:
        desc = character_descriptions.get(char_name, "")
        if desc:
            character_detail_lines.append(f"  - {char_name}: {desc}")
        else:
            character_detail_lines.append(f"  - {char_name}")
    characters_block = "\n".join(character_detail_lines) if character_detail_lines else "  No characters"

    dialogue_text = panel.dialogue if panel.dialogue else "No dialogue"

    scene_prompt = f"""[STYLE] Manga panel, {genre} genre. Black and white ink with screentone shading. Weekly Shonen Jump serialization style. {style_prompt}.
[SCENE] {panel.description}
[MOOD] {panel.mood}
[DIALOGUE] Speech bubbles: {dialogue_text}
[CHARACTERS IN PANEL]
{characters_block}

CRITICAL RULES:
- Match every character's appearance EXACTLY to their settei reference sheet above.
- This is a SINGLE panel — ONE scene only. Do NOT draw borders, frames, or subdivide into multiple panels.
- Fill the entire {aspect_ratio} image edge-to-edge with the artwork. No margins.
- Do NOT render any text labels like "Page" or "Panel" numbers into the artwork."""

    contents.append(types.Part.from_text(text=scene_prompt))

    last_error = None
    for model_name in IMAGE_MODELS:
        try:
            logger.info(f"[gemini] Generating panel p{page_number}_n{panel.panel_number} with {model_name}")
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=GenerateContentConfig(
                    system_instruction=PANEL_SYSTEM_PROMPT,
                    response_modalities=["IMAGE", "TEXT"],
                    image_config=ImageConfig(aspect_ratio=aspect_ratio),
                ),
            )

            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    logger.info(f"[gemini] Panel p{page_number}_n{panel.panel_number} generated, size={len(part.inline_data.data)} bytes")
                    return part.inline_data.data

            raise RuntimeError(f"No image returned for panel p{page_number}_n{panel.panel_number}")

        except Exception as e:
            last_error = e
            logger.warning(f"[gemini] {model_name} failed for panel p{page_number}_n{panel.panel_number}: {e}")
            continue

    raise RuntimeError(f"All models failed for panel p{page_number}_n{panel.panel_number}: {last_error}")


PAGE_SYSTEM_PROMPT = """You are a professional manga page artist creating COMPLETE manga pages in the style of published tankōbon volumes.

You are generating a FULL MANGA PAGE — multiple panels arranged with black gutters, speech bubbles, and effects.

CRITICAL LAYOUT RULES:
- Create a dynamic panel layout with 3-6 panels per page
- Use black gutters/borders between panels (standard manga style)
- Panels can vary in size — use large panels for dramatic moments, small panels for dialogue
- Panels can overlap, bleed to edges, or break conventional grid layouts for impact
- Speech bubbles must contain the provided dialogue text, placed naturally within panels
- The page should read top-to-bottom, right-to-left (standard manga reading order)

ART STYLE RULES (strictly enforced):
- Black and white ink artwork with screentone shading (no color, no grayscale wash)
- Clean, sharp linework in the style of classic Weekly Shonen Jump serialization
- Consistent line weight: thick outlines for characters, thin lines for details
- Screentone dots for shadows and mid-tones (not crosshatching, not stippling)
- High contrast: pure black shadows, pure white highlights
- Speed lines, impact effects, and emotion symbols where appropriate
- Hand-lettered style text in speech bubbles

CHARACTER CONSISTENCY IS THE TOP PRIORITY:
- You are given reference settei (model sheets) for each character. Match their designs EXACTLY.
- Hair style, eye shape, body proportions, clothing details must be identical to the reference.
- When in doubt, refer back to the settei sheet — it is the ground truth."""


async def generate_page(
    page: PageScript,
    character_sheets: dict[str, bytes],
    character_descriptions: dict[str, str],
    previous_page_bytes: bytes | None,
    genre: str,
    style_prompt: str,
) -> bytes:
    client = _get_client()

    contents: list[types.Part] = []

    # Pass ALL settei sheets as reference
    all_characters_in_page = set()
    for panel in page.panels:
        all_characters_in_page.update(panel.characters_present)

    for char_name, sheet_bytes in character_sheets.items():
        contents.append(types.Part.from_bytes(
            data=sheet_bytes,
            mime_type="image/png",
        ))
        if char_name in all_characters_in_page:
            contents.append(types.Part.from_text(
                text=f"[CHARACTER REFERENCE — ON THIS PAGE] {char_name} — settei/model sheet above. This character APPEARS on this page. Match this design EXACTLY.",
            ))
        else:
            contents.append(types.Part.from_text(
                text=f"[CHARACTER REFERENCE — NOT ON PAGE] {char_name} — settei/model sheet above. Provided for style consistency.",
            ))

    # Add previous page for visual continuity
    if previous_page_bytes is not None:
        contents.append(types.Part.from_bytes(
            data=previous_page_bytes,
            mime_type="image/png",
        ))
        contents.append(types.Part.from_text(
            text="[PREVIOUS PAGE] The image above is the previous manga page. Maintain visual continuity in art style, character proportions, and environment.",
        ))

    # Build panel descriptions
    panels_block = ""
    for panel in page.panels:
        char_details = []
        for char_name in panel.characters_present:
            desc = character_descriptions.get(char_name, "")
            char_details.append(f"      - {char_name}: {desc}" if desc else f"      - {char_name}")
        chars_text = "\n".join(char_details) if char_details else "      No characters"
        dialogue_text = panel.dialogue if panel.dialogue else "No dialogue"

        panels_block += f"""
    Panel {panel.panel_number}:
      Description: {panel.description}
      Mood: {panel.mood}
      Dialogue (in speech bubbles): {dialogue_text}
      Characters:
{chars_text}
"""

    scene_prompt = f"""[STYLE] Complete manga page, {genre} genre. Black and white ink with screentone shading. Weekly Shonen Jump serialization style. {style_prompt}.
[PAGE {page.page_number}] Create a full manga page with the following panels:
{panels_block}
CRITICAL RULES:
- This is a COMPLETE manga page with multiple panels, black gutters, and speech bubbles.
- Match every character's appearance EXACTLY to their settei reference sheet above.
- Include ALL dialogue in speech bubbles within the appropriate panels.
- Use dynamic panel sizing — vary panel sizes for dramatic pacing.
- Add speed lines, screentone, and manga effects where the mood calls for it.
- Fill the entire 2:3 page. No white margins around the outer edges.
- Do NOT render any text labels like "Page" or "Panel" numbers into the artwork."""

    contents.append(types.Part.from_text(text=scene_prompt))

    last_error = None
    for model_name in IMAGE_MODELS:
        try:
            logger.info(f"[gemini] Generating page {page.page_number} with {model_name}")
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=GenerateContentConfig(
                    system_instruction=PAGE_SYSTEM_PROMPT,
                    response_modalities=["IMAGE", "TEXT"],
                    image_config=ImageConfig(aspect_ratio="2:3"),
                ),
            )

            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    logger.info(f"[gemini] Page {page.page_number} generated, size={len(part.inline_data.data)} bytes")
                    return part.inline_data.data

            raise RuntimeError(f"No image returned for page {page.page_number}")

        except Exception as e:
            last_error = e
            logger.warning(f"[gemini] {model_name} failed for page {page.page_number}: {e}")
            continue

    raise RuntimeError(f"All models failed for page {page.page_number}: {last_error}")


SKETCH_TO_MANGA_SYSTEM_PROMPT = """You are a professional manga artist who converts rough sketches into polished manga pages.

Given a rough sketch/drawing, convert it into clean, professional manga artwork while preserving the original composition.

CONVERSION RULES:
- Use the sketch as a composition and layout reference — preserve the artist's spatial arrangement
- Convert rough lines to clean, sharp manga linework
- Add screentone shading for shadows and mid-tones
- Preserve character poses, panel layout, and spatial relationships from the sketch
- Do NOT add or remove characters or major elements that aren't in the sketch
- Do NOT change the panel layout or composition — follow the sketch faithfully
- Add manga-style effects (speed lines, impact marks, emotion symbols) where appropriate
- If dialogue is provided, add speech bubbles with the text in appropriate locations

CHARACTER CONSISTENCY:
- If settei (model sheets) are provided, match character designs EXACTLY to their references
- Hair style, eye shape, body proportions, clothing details must be identical to the settei
- If a previous converted page is provided, maintain visual continuity across pages

ART STYLE:
- Black and white ink artwork with screentone shading (no color)
- Clean, sharp linework in professional manga style
- High contrast: pure black shadows, pure white highlights
- Screentone dots for mid-tones"""


async def sketch_to_manga(
    sketch_bytes: bytes,
    style_hint: str,
    genre: str,
    character_sheets: dict[str, bytes],
    character_descriptions: dict[str, str],
    previous_page_bytes: bytes | None,
    include_dialogue: bool,
    dialogue_hints: str,
) -> bytes:
    client = _get_client()

    contents: list[types.Part] = []

    # Pass settei sheets as reference first (same pattern as generate_page)
    for char_name, sheet_bytes in character_sheets.items():
        contents.append(types.Part.from_bytes(data=sheet_bytes, mime_type="image/png"))
        desc = character_descriptions.get(char_name, "")
        desc_text = f" ({desc})" if desc else ""
        contents.append(types.Part.from_text(
            text=f"[CHARACTER REFERENCE] {char_name}{desc_text} — settei/model sheet above. Match this design EXACTLY when converting the sketch.",
        ))

    # Add previous converted page for continuity
    if previous_page_bytes is not None:
        contents.append(types.Part.from_bytes(data=previous_page_bytes, mime_type="image/png"))
        contents.append(types.Part.from_text(
            text="[PREVIOUS PAGE] The image above is the previous converted manga page. Maintain visual continuity in art style, character proportions, and environment.",
        ))

    # Input sketch
    contents.append(types.Part.from_bytes(data=sketch_bytes, mime_type="image/png"))
    contents.append(types.Part.from_text(
        text="[INPUT SKETCH] The image above is the rough sketch to convert into polished manga artwork.",
    ))

    # Build the conversion prompt
    style_line = f"Style: {style_hint}. " if style_hint else ""
    genre_line = f"Genre: {genre}. " if genre else ""

    char_lines = []
    for name, desc in character_descriptions.items():
        if desc:
            char_lines.append(f"  - {name}: {desc}")
    char_block = "\n".join(char_lines)
    char_section = f"Characters:\n{char_block}\n" if char_lines else ""

    dialogue_line = ""
    if include_dialogue and dialogue_hints:
        dialogue_line = f"Add speech bubbles with this dialogue: {dialogue_hints}. "

    prompt = f"""Convert the rough sketch above into a polished, professional manga page.
{style_line}{genre_line}{char_section}{dialogue_line}
RULES:
- Preserve the sketch's composition, panel layout, and character positions EXACTLY.
- Convert rough lines to clean manga linework with screentone shading.
- Match every character's appearance EXACTLY to their settei reference sheet (if provided).
- Maintain visual consistency with the previous page (if provided).
- Add manga effects (speed lines, screentone, impact marks) where appropriate.
- {'Add speech bubbles with the provided dialogue.' if include_dialogue and dialogue_hints else 'Do not add speech bubbles unless they are clearly indicated in the sketch.'}
- Output a complete, polished manga page."""

    contents.append(types.Part.from_text(text=prompt))

    last_error = None
    for model_name in IMAGE_MODELS:
        try:
            logger.info(f"[gemini] Converting sketch to manga with {model_name}")
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=GenerateContentConfig(
                    system_instruction=SKETCH_TO_MANGA_SYSTEM_PROMPT,
                    response_modalities=["IMAGE", "TEXT"],
                    image_config=ImageConfig(aspect_ratio="2:3"),
                ),
            )

            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    logger.info(f"[gemini] Sketch conversion complete, size={len(part.inline_data.data)} bytes")
                    return part.inline_data.data

            raise RuntimeError("No image returned for sketch conversion")

        except Exception as e:
            last_error = e
            logger.warning(f"[gemini] {model_name} failed for sketch conversion: {e}")
            continue

    raise RuntimeError(f"All models failed for sketch conversion: {last_error}")
