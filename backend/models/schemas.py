from pydantic import BaseModel


class StoryRequest(BaseModel):
    genre: str
    prompt: str
    page_count: int


class Character(BaseModel):
    name: str
    role: str
    visual_description: str
    personality: str


class PanelScript(BaseModel):
    panel_number: int
    description: str
    dialogue: str
    characters_present: list[str]
    mood: str


class PageScript(BaseModel):
    page_number: int
    panels: list[PanelScript]


class StoryResponse(BaseModel):
    title: str
    title_japanese: str
    synopsis: str
    characters: list[Character]
    pages: list[PageScript]


class CharacterSheetRequest(BaseModel):
    characters: list[Character]
    style_hint: str


class CharacterSheetEvent(BaseModel):
    character_name: str
    image_base64: str
    status: str  # "complete" | "error"
    error_message: str


class PanelGenerationRequest(BaseModel):
    pages: list[PageScript]
    characters: list[Character]  # full character data for text descriptions
    character_sheets: dict[str, str]  # name -> base64 PNG
    genre: str
    style_prompt: str
    panel_aspect_ratios: dict[str, str] = {}  # panel key (p1_n1) -> ratio (3:4)


class PanelGenerationEvent(BaseModel):
    page_number: int
    panel_number: int
    image_base64: str
    status: str  # "complete" | "error"
    error_message: str


class PageGenerationRequest(BaseModel):
    pages: list[PageScript]
    characters: list[Character]
    character_sheets: dict[str, str]  # name -> base64 PNG
    genre: str
    style_prompt: str


class PageGenerationEvent(BaseModel):
    page_number: int
    image_base64: str
    status: str  # "complete" | "error"
    error_message: str


class CharacterExtractResponse(BaseModel):
    characters: list[Character]


class SketchToMangaRequest(BaseModel):
    sketch_images: list[str]              # base64 PNG/JPG
    style_hint: str = ""
    genre: str = ""
    include_dialogue: bool = False
    dialogue_hints: str = ""
    auto_extract: bool = True             # run character extraction phase
    reference_images: dict[str, str] = {} # name -> base64 (user-uploaded settei)


class SketchToMangaStreamEvent(BaseModel):
    phase: str                                    # "extract" | "settei" | "convert"
    characters: list[Character] | None = None     # phase=extract
    character_name: str | None = None             # phase=settei
    settei_base64: str | None = None              # phase=settei
    image_index: int | None = None                # phase=convert
    image_base64: str | None = None               # phase=convert
    status: str                                   # "complete" | "error" | "skipped"
    error_message: str = ""
