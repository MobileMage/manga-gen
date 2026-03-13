import base64
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from auth import verify_token
from models.schemas import CharacterSheetEvent, CharacterSheetRequest, PanelGenerationEvent, PanelGenerationRequest, StoryRequest, StoryResponse
from services.gemini import generate_character_sheet, generate_panel, generate_story

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
