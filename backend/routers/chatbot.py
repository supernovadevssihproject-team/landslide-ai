from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.services.chatbot_service import normalize_chatbot_language, process_chat_message

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])

class ChatTurn(BaseModel):
    role: str = Field(..., description="Message author: 'user' or 'assistant'")
    content: str = Field(..., description="Message text")

class ChatRequest(BaseModel):
    message: str = Field(..., description="Current user input text")
    history: List[ChatTurn] = Field(default_factory=list, description="Previous chat turn history")
    language: str = Field(default="en", description="Chatbot response language code")

class ChatAction(BaseModel):
    type: str = Field(..., description="Action type: NAVIGATE, SELECT_REGION, SELECT_ZONE")
    module: Optional[str] = Field(None, description="Operational module target")
    region_id: Optional[str] = Field(None, description="Region ID")
    zone_id: Optional[str] = Field(None, description="Zone ID")
    coordinates: Optional[Dict[str, float]] = Field(None, description="Map coordinates")

class ChatResponse(BaseModel):
    reply: str = Field(..., description="Grounded chatbot response text")
    source: str = Field(..., description="Model or engine source used")
    action: Optional[ChatAction] = Field(None, description="Interactive chat action")

@router.post("", response_model=ChatResponse)
@router.post("/", response_model=ChatResponse)
def handle_chat_turn(request: ChatRequest):
    try:
        hist_dicts = [{"role": turn.role, "content": turn.content} for turn in request.history]
        res = process_chat_message(
            request.message,
            hist_dicts,
            language=normalize_chatbot_language(request.language),
        )
        
        action_obj = None
        if res.get("action"):
            act = res["action"]
            action_obj = ChatAction(
                type=act.get("type", "NAVIGATE"),
                module=act.get("module"),
                region_id=act.get("region_id"),
                zone_id=act.get("zone_id"),
                coordinates=act.get("coordinates")
            )
            
        return ChatResponse(
            reply=res["reply"],
            source=res.get("source", "terraguard-engine"),
            action=action_obj
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chatbot service error: {str(e)}")

