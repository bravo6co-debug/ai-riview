"""
AI 서비스 통합 인터페이스
감정 분석 + 답글 생성을 하나의 API로 제공
"""

from typing import Dict, Optional
from .sentiment_analyzer import SentimentAnalyzer
from .ai_reply_generator import AIReplyGenerator


class AIServiceV2:
    """통합 AI 서비스"""

    def __init__(self, openai_api_key: str, supabase_client=None):
        self.sentiment_analyzer = SentimentAnalyzer(openai_api_key, supabase_client)
        self.reply_generator = AIReplyGenerator(openai_api_key)
        self.supabase = supabase_client

    async def generate_reply(
        self,
        review_content: str,
        options: Optional[Dict] = None
    ) -> Dict:
        """
        리뷰 내용을 받아서 감정 분석 후 답글 생성

        Args:
            review_content: 리뷰 내용
            options: {
                "brand_context": "카페" (매장 유형),
                "user_id": UUID (사용자 ID),
                "save_to_db": True (DB 저장 여부)
            }

        Returns:
            {
                "success": True,
                "reply": "생성된 답글",
                "sentiment": "positive|negative|neutral",
                "sentiment_strength": 0.85,
                "topics": ["맛/품질", "서비스"],
                "keywords": ["맛있", "친절"],
                "analysis_time_ms": 842,
                "reply_generation_time_ms": 534
            }
        """
        options = options or {}
        brand_context = options.get("brand_context", "카페")

        try:
            # 1. 감정 분석 (3단계 하이브리드)
            analysis_result = await self.sentiment_analyzer.analyze(review_content)

            if not analysis_result.get("success"):
                return {
                    "success": False,
                    "error": "감정 분석 실패"
                }

            # 2. 답글 생성
            reply_result = await self.reply_generator.generate_reply(
                review_content=review_content,
                analysis_result=analysis_result,
                brand_context=brand_context
            )

            if not reply_result.get("success"):
                return {
                    "success": False,
                    "error": "답글 생성 실패"
                }

            # 3. 결과 통합
            result = {
                "success": True,
                "reply": reply_result["reply"],
                "sentiment": analysis_result["sentiment"],
                "sentiment_strength": analysis_result["sentiment_strength"],
                "topics": analysis_result["topics"],
                "keywords": analysis_result["keywords"],
                "intent": analysis_result.get("intent", "일반"),
                "analysis_time_ms": analysis_result.get("analysis_time_ms", 0),
                "analysis_source": analysis_result.get("analysis_source", "unknown"),
                "model_used": reply_result.get("model_used", "unknown"),
                "tokens_used": reply_result.get("tokens_used", 0)
            }

            # 4. DB 저장 (선택 사항)
            if options.get("save_to_db") and self.supabase and options.get("user_id"):
                await self._save_to_history(
                    user_id=options["user_id"],
                    review_content=review_content,
                    result=result
                )

            return result

        except Exception as e:
            print(f"AI 서비스 오류: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _save_to_history(
        self,
        user_id: str,
        review_content: str,
        result: Dict
    ):
        """이력 저장"""
        try:
            import json

            self.supabase.table("reply_history").insert({
                "user_id": user_id,
                "review_content": review_content,
                "generated_reply": result["reply"],
                "sentiment": result["sentiment"],
                "sentiment_strength": result["sentiment_strength"],
                "topics": json.dumps(result["topics"]) if isinstance(result["topics"], list) else result["topics"],
                "keywords": json.dumps(result["keywords"]) if isinstance(result["keywords"], list) else result["keywords"]
            }).execute()
        except Exception as e:
            print(f"이력 저장 실패: {e}")
