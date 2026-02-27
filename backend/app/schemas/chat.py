from pydantic import BaseModel, Field


class ChatSource(BaseModel):
    variant_id: str
    gene: str | None = None
    relevance: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(..., min_length=1)
    variant_context: bool = True


class ChatResponse(BaseModel):
    reply: str
    sources: list[ChatSource] = []
    session_id: str


class SuggestionItem(BaseModel):
    text: str
    category: str


class SuggestionsResponse(BaseModel):
    suggestions: list[SuggestionItem]
