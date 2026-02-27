from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatSource,
    SuggestionsResponse,
    SuggestionItem,
)
from app.services.chat_service import chat, get_suggestions, clear_conversation

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def send_chat_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message to the AI chat assistant.

    Maintains conversation history per session via Redis.
    Optionally includes variant dataset context for informed responses.
    """
    result = await chat(
        message=request.message,
        session_id=request.session_id,
        variant_context=request.variant_context,
        db=db,
    )

    return ChatResponse(
        reply=result["reply"],
        sources=[ChatSource(**s) for s in result["sources"]],
        session_id=result["session_id"],
    )


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_chat_suggestions(
    db: AsyncSession = Depends(get_db),
):
    """
    Get contextual starter questions based on the current dataset.

    Returns suggested questions that are relevant to the uploaded variants.
    """
    suggestions = await get_suggestions(db)
    return SuggestionsResponse(
        suggestions=[SuggestionItem(**s) for s in suggestions]
    )


@router.delete("/session/{session_id}")
async def clear_chat_session(session_id: str):
    """
    Clear conversation history for a specific session.
    """
    await clear_conversation(session_id)
    return {"status": "cleared", "session_id": session_id}
