import logging
import os
from google import genai
from google.genai.types import GenerateContentConfig, ImageConfig
from google.genai import types
from models.schemas import Character, PanelScript, StoryRequest, StoryResponse

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
