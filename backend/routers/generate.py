import base64
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from auth import verify_token
from models.schemas import (
    CharacterSheetEvent, CharacterSheetRequest,
    PageGenerationEvent, PageGenerationRequest,
    PanelGenerationEvent, PanelGenerationRequest,
    SketchToMangaRequest, SketchToMangaStreamEvent,
    StoryRequest, StoryResponse,
)
from services.gemini import (
    extract_characters_from_sketches,
    generate_character_sheet,
    generate_character_sheet_from_sketches,
    generate_page,
    generate_panel,
    generate_story,
    sketch_to_manga,
)

logger = logging.getLogger("manga-gen.generate")

router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("/story", response_model=StoryResponse)
async def create_story(request: StoryRequest, _user: dict = Depends(verify_token)):
    uid = _user.get("uid", "unknown")
    logger.info(f"[generate] POST /story from uid={uid} genre={request.genre} pages={request.page_count} prompt_len={len(request.prompt)}")
    try:
        result = await generate_story(request)
        logger.info(f"[generate] Success: title={result.title!r} chars={len(result.characters)} pages={len(result.pages)}")
        return result
    except Exception as e:
        logger.exception(f"[generate] Failed for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/character-sheets")
async def create_character_sheets(
    request: CharacterSheetRequest,
    _user: dict = Depends(verify_token),
):
    uid = _user.get("uid", "unknown")
    logger.info(f"[generate] POST /character-sheets from uid={uid} characters={len(request.characters)}")

    async def event_stream():
        for character in request.characters:
            try:
                name, png_bytes = await generate_character_sheet(character, request.style_hint)
                b64 = base64.b64encode(png_bytes).decode("ascii")
                event = CharacterSheetEvent(
                    character_name=name,
                    image_base64=b64,
                    status="complete",
                    error_message="",
                )
                logger.info(f"[generate] Settei complete for {name!r}, b64_len={len(b64)}")
            except Exception as e:
                logger.exception(f"[generate] Settei failed for {character.name!r}: {e}")
                event = CharacterSheetEvent(
                    character_name=character.name,
                    image_base64="",
                    status="error",
                    error_message=str(e),
                )
            yield f"data: {event.model_dump_json()}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/panels-stream")
async def create_panels_stream(
    request: PanelGenerationRequest,
    _user: dict = Depends(verify_token),
):
    uid = _user.get("uid", "unknown")
    total_panels = sum(len(p.panels) for p in request.pages)
    logger.info(f"[generate] POST /panels-stream from uid={uid} pages={len(request.pages)} panels={total_panels}")

    # Pre-decode all character sheets from base64 to bytes
    character_sheet_bytes: dict[str, bytes] = {}
    for name, b64 in request.character_sheets.items():
        try:
            character_sheet_bytes[name] = base64.b64decode(b64)
        except Exception as e:
            logger.warning(f"[generate] Failed to decode sheet for {name!r}: {e}")

    # Build character descriptions dict: name -> visual_description
    character_descriptions: dict[str, str] = {
        c.name: c.visual_description for c in request.characters
    }

    async def event_stream():
        previous_panel_bytes: bytes | None = None

        for page in request.pages:
            previous_panel_bytes = None  # Reset at each new page

            for panel in page.panels:
                panel_key = f"p{page.page_number}_n{panel.panel_number}"
                aspect_ratio = request.panel_aspect_ratios.get(panel_key, "3:4")
                try:
                    png_bytes = await generate_panel(
                        panel=panel,
                        page_number=page.page_number,
                        character_sheets=character_sheet_bytes,
                        character_descriptions=character_descriptions,
                        previous_panel_bytes=previous_panel_bytes,
                        genre=request.genre,
                        style_prompt=request.style_prompt,
                        aspect_ratio=aspect_ratio,
                    )
                    b64 = base64.b64encode(png_bytes).decode("ascii")
                    event = PanelGenerationEvent(
                        page_number=page.page_number,
                        panel_number=panel.panel_number,
                        image_base64=b64,
                        status="complete",
                        error_message="",
                    )
                    previous_panel_bytes = png_bytes
                    logger.info(f"[generate] Panel p{page.page_number}_n{panel.panel_number} complete, b64_len={len(b64)}")
                except Exception as e:
                    logger.exception(f"[generate] Panel p{page.page_number}_n{panel.panel_number} failed: {e}")
                    event = PanelGenerationEvent(
                        page_number=page.page_number,
                        panel_number=panel.panel_number,
                        image_base64="",
                        status="error",
                        error_message=str(e),
                    )
                    previous_panel_bytes = None

                yield f"data: {event.model_dump_json()}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/pages-stream")
async def create_pages_stream(
    request: PageGenerationRequest,
    _user: dict = Depends(verify_token),
):
    uid = _user.get("uid", "unknown")
    logger.info(f"[generate] POST /pages-stream from uid={uid} pages={len(request.pages)}")

    # Pre-decode all character sheets from base64 to bytes
    character_sheet_bytes: dict[str, bytes] = {}
    for name, b64 in request.character_sheets.items():
        try:
            character_sheet_bytes[name] = base64.b64decode(b64)
        except Exception as e:
            logger.warning(f"[generate] Failed to decode sheet for {name!r}: {e}")

    # Build character descriptions dict: name -> visual_description
    character_descriptions: dict[str, str] = {
        c.name: c.visual_description for c in request.characters
    }

    async def event_stream():
        previous_page_bytes: bytes | None = None

        for page in request.pages:
            try:
                png_bytes = await generate_page(
                    page=page,
                    character_sheets=character_sheet_bytes,
                    character_descriptions=character_descriptions,
                    previous_page_bytes=previous_page_bytes,
                    genre=request.genre,
                    style_prompt=request.style_prompt,
                )
                b64 = base64.b64encode(png_bytes).decode("ascii")
                event = PageGenerationEvent(
                    page_number=page.page_number,
                    image_base64=b64,
                    status="complete",
                    error_message="",
                )
                previous_page_bytes = png_bytes
                logger.info(f"[generate] Page {page.page_number} complete, b64_len={len(b64)}")
            except Exception as e:
                logger.exception(f"[generate] Page {page.page_number} failed: {e}")
                event = PageGenerationEvent(
                    page_number=page.page_number,
                    image_base64="",
                    status="error",
                    error_message=str(e),
                )
                previous_page_bytes = None

            yield f"data: {event.model_dump_json()}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/sketch-to-manga")
async def create_sketch_to_manga(
    request: SketchToMangaRequest,
    _user: dict = Depends(verify_token),
):
    uid = _user.get("uid", "unknown")
    logger.info(
        f"[generate] POST /sketch-to-manga from uid={uid} "
        f"sketches={len(request.sketch_images)} auto_extract={request.auto_extract} "
        f"refs={len(request.reference_images)}"
    )

    # Pre-decode all sketch images
    sketch_bytes_list: list[bytes] = []
    for b64 in request.sketch_images:
        sketch_bytes_list.append(base64.b64decode(b64))

    # Pre-decode user-uploaded reference images
    user_ref_bytes: dict[str, bytes] = {}
    for name, b64 in request.reference_images.items():
        try:
            user_ref_bytes[name] = base64.b64decode(b64)
        except Exception as e:
            logger.warning(f"[generate] Failed to decode reference for {name!r}: {e}")

    async def event_stream():
        character_sheet_bytes: dict[str, bytes] = dict(user_ref_bytes)
        character_descriptions: dict[str, str] = {}
        extracted_characters = []
        # Names already covered by user-uploaded references (case-insensitive)
        user_ref_names_lower = {n.lower() for n in user_ref_bytes}

        # ── Phase 1: Extract ──
        if request.auto_extract:
            try:
                extract_result = await extract_characters_from_sketches(
                    sketch_images=sketch_bytes_list,
                    genre=request.genre,
                )
                extracted_characters = extract_result.characters
                for char in extracted_characters:
                    character_descriptions[char.name] = char.visual_description
                event = SketchToMangaStreamEvent(
                    phase="extract",
                    characters=extracted_characters,
                    status="complete",
                )
                logger.info(f"[generate] Extracted {len(extracted_characters)} characters")
            except Exception as e:
                logger.exception(f"[generate] Character extraction failed: {e}")
                event = SketchToMangaStreamEvent(
                    phase="extract",
                    characters=[],
                    status="error",
                    error_message=str(e),
                )
            yield f"data: {event.model_dump_json()}\n\n"
        else:
            event = SketchToMangaStreamEvent(phase="extract", status="skipped")
            yield f"data: {event.model_dump_json()}\n\n"

        # ── Phase 2: Settei ──
        # Generate settei for extracted characters not already covered by user references
        extracted_chars_needing_settei = [
            char for char in extracted_characters
            if char.name.lower() not in user_ref_names_lower
        ]

        # Emit skipped events for user-referenced characters
        for name in user_ref_bytes:
            event = SketchToMangaStreamEvent(
                phase="settei",
                character_name=name,
                status="skipped",
            )
            yield f"data: {event.model_dump_json()}\n\n"

        for char in extracted_chars_needing_settei:
            try:
                _, sheet_bytes = await generate_character_sheet_from_sketches(
                    character=char,
                    style_hint=request.style_hint,
                    sketch_images=sketch_bytes_list,
                )
                character_sheet_bytes[char.name] = sheet_bytes
                b64 = base64.b64encode(sheet_bytes).decode("ascii")
                event = SketchToMangaStreamEvent(
                    phase="settei",
                    character_name=char.name,
                    settei_base64=b64,
                    status="complete",
                )
                logger.info(f"[generate] Settei generated for {char.name!r}")
            except Exception as e:
                logger.exception(f"[generate] Settei failed for {char.name!r}: {e}")
                event = SketchToMangaStreamEvent(
                    phase="settei",
                    character_name=char.name,
                    status="error",
                    error_message=str(e),
                )
            yield f"data: {event.model_dump_json()}\n\n"

        # ── Phase 3: Convert ──
        previous_page_bytes: bytes | None = None

        for i, sketch_bytes in enumerate(sketch_bytes_list):
            try:
                png_bytes = await sketch_to_manga(
                    sketch_bytes=sketch_bytes,
                    style_hint=request.style_hint,
                    genre=request.genre,
                    character_sheets=character_sheet_bytes,
                    character_descriptions=character_descriptions,
                    previous_page_bytes=previous_page_bytes,
                    include_dialogue=request.include_dialogue,
                    dialogue_hints=request.dialogue_hints,
                )
                b64 = base64.b64encode(png_bytes).decode("ascii")
                event = SketchToMangaStreamEvent(
                    phase="convert",
                    image_index=i,
                    image_base64=b64,
                    status="complete",
                )
                previous_page_bytes = png_bytes
                logger.info(f"[generate] Sketch {i} conversion complete, b64_len={len(b64)}")
            except Exception as e:
                logger.exception(f"[generate] Sketch {i} conversion failed: {e}")
                event = SketchToMangaStreamEvent(
                    phase="convert",
                    image_index=i,
                    status="error",
                    error_message=str(e),
                )
                previous_page_bytes = None

            yield f"data: {event.model_dump_json()}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
