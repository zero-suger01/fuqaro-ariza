from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.complaint import AIAnalyzeRequest, AIAnalyzeResponse
from app.services.ai.classifier import analyze
from app.services.ai.recommend import recommend_organizations

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/analyze", response_model=AIAnalyzeResponse)
def analyze_complaint(payload: AIAnalyzeRequest, current_user: User = Depends(get_current_user)):
    result = analyze(payload.description)
    return AIAnalyzeResponse(
        category=result.category,
        confidence=result.confidence,
        recommended_organizations=recommend_organizations(result.category),
    )
