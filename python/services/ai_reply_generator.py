"""
AI 기반 답글 생성 엔진
감정 분석 결과를 기반으로 맥락에 맞는 고품질 답글 생성
"""

from typing import Dict
from openai import OpenAI


class AIReplyGenerator:
    """답글 생성 엔진"""

    def __init__(self, openai_api_key: str):
        self.client = OpenAI(api_key=openai_api_key)

    async def generate_reply(
        self,
        review_content: str,
        analysis_result: Dict,
        brand_context: str = "카페"
    ) -> Dict:
        """답글 생성"""

        # 감정별 시스템 프롬프트
        system_prompt = self._get_system_prompt(analysis_result["sentiment"])

        # 고도화 프롬프트 구성
        user_prompt = self._build_user_prompt(
            review_content,
            analysis_result,
            brand_context
        )

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=250,
                presence_penalty=0.4,
                frequency_penalty=0.3
            )

            generated_reply = response.choices[0].message.content.strip()

            # 답글 검증
            validated_reply = self._validate_and_adjust_reply(
                generated_reply,
                analysis_result
            )

            return {
                "success": True,
                "reply": validated_reply,
                "model_used": "gpt-4o-mini",
                "tokens_used": response.usage.total_tokens if response.usage else 0
            }

        except Exception as e:
            print(f"답글 생성 실패: {e}")
            # 템플릿 폴백
            fallback_reply = self._generate_template_reply(
                analysis_result["sentiment"],
                analysis_result.get("topics", []),
                analysis_result.get("keywords", [])
            )
            return {
                "success": True,
                "reply": fallback_reply,
                "model_used": "template",
                "tokens_used": 0
            }

    def _get_system_prompt(self, sentiment: str) -> str:
        """감정별 시스템 프롬프트"""
        prompts = {
            "positive": """당신은 한국 프랜차이즈 매장의 전문적이고 진심어린 고객 서비스 담당자입니다.

고객의 긍정적인 리뷰에 감사하며, 진정성 있고 따뜻한 답글을 작성합니다.
형식적이지 않고 고객이 언급한 구체적인 내용을 인용하여 답변합니다.

답글 작성 원칙:
- 고객이 언급한 구체적인 내용(맛, 서비스, 분위기 등)을 인용
- 80-120자 내외로 간결하게
- 따뜻하고 진정성 있는 톤
- 자연스러운 이모지 1-2개 사용
- 형식적인 문구 지양""",

            "negative": """당신은 한국 프랜차이즈 매장의 전문적이고 진심어린 고객 서비스 담당자입니다.

고객의 불만에 진심으로 공감하고 사과하며, 구체적인 개선 방안을 제시합니다.
변명하거나 책임을 회피하지 않고, 문제를 정확히 이해했음을 보여줍니다.

답글 작성 원칙:
- 진심 어린 사과로 시작
- 고객이 지적한 구체적인 문제점 언급
- 명확한 개선 약속 또는 보상 제안
- 80-120자 내외로 간결하게
- 진지하고 책임감 있는 톤
- 변명이나 책임 회피 금지""",

            "neutral": """당신은 한국 프랜차이즈 매장의 전문적이고 진심어린 고객 서비스 담당자입니다.

고객의 방문과 피드백에 감사하며, 더 나은 경험을 제공하겠다는 의지를 전달합니다.

답글 작성 원칙:
- 방문 감사 표현
- 고객의 피드백을 진지하게 받아들임을 표현
- 개선 의지 전달
- 80-120자 내외로 간결하게
- 정중하고 따뜻한 톤
- 자연스러운 이모지 1개 사용"""
        }

        return prompts.get(sentiment, prompts["neutral"])

    def _build_user_prompt(
        self,
        review_content: str,
        analysis_result: Dict,
        brand_context: str
    ) -> str:
        """고도화 프롬프트 구성"""

        sentiment = analysis_result["sentiment"]
        topics = ", ".join(analysis_result.get("topics", []))
        keywords = ", ".join(analysis_result.get("keywords", []))
        intent = analysis_result.get("intent", "일반")
        reply_focus = analysis_result.get("reply_focus", [])
        reply_avoid = analysis_result.get("reply_avoid", [])

        prompt = f"""[고객 리뷰 분석 결과]
감정: {sentiment} (강도: {int(analysis_result.get('sentiment_strength', 0.5) * 100)}%)
고객 의도: {intent}
주요 주제: {topics}
핵심 키워드: {keywords}

[리뷰 내용]
"{review_content}"

[매장 정보]
- 매장명/유형: {brand_context}

[답글 작성 가이드라인]
강조할 포인트:
{chr(10).join(f"- {point}" for point in reply_focus) if reply_focus else "- 고객의 피드백에 진심으로 감사"}

피해야 할 요소:
{chr(10).join(f"- {avoid}" for avoid in reply_avoid) if reply_avoid else "- 형식적인 답변"}

[구체적 요구사항]
1. 고객이 언급한 구체적인 키워드를 반드시 1-2개 포함
2. 80-120자 길이 (공백 포함)
3. 자연스러운 한국어 구어체
4. 이모지는 최소한으로 (1-2개)
5. 문장은 2-3개로 구성

답글만 작성하세요 (부가 설명 없이):"""

        return prompt

    def _validate_and_adjust_reply(
        self,
        reply: str,
        analysis_result: Dict
    ) -> str:
        """답글 검증 및 후처리"""

        # 따옴표 제거
        reply = reply.strip('"\'')

        # 길이 체크
        if len(reply) < 40:
            # 너무 짧으면 템플릿으로 대체
            return self._generate_template_reply(
                analysis_result["sentiment"],
                analysis_result.get("topics", []),
                analysis_result.get("keywords", [])
            )

        # 길이가 너무 길면 잘라내기
        if len(reply) > 150:
            sentences = reply.split('.')
            reply = '. '.join(sentences[:2]) + '.'
            if len(reply) > 150:
                reply = reply[:147] + '...'

        return reply

    def _generate_template_reply(
        self,
        sentiment: str,
        topics: list,
        keywords: list
    ) -> str:
        """템플릿 기반 폴백 답글"""

        templates = {
            "positive": [
                f"좋게 봐주셔서 감사합니다 😊 {keywords[0] if keywords else '방문'}해 주셔서 정말 기쁩니다. 앞으로도 더 좋은 모습으로 찾아뵙겠습니다!",
                f"{keywords[0] if keywords else '서비스'} 만족스러우셨다니 기쁩니다! 항상 최선을 다하는 저희 매장이 되겠습니다. 다음에 또 뵙겠습니다 😊"
            ],
            "negative": [
                f"불편을 드려 정말 죄송합니다. {topics[0] if topics else '서비스'} 관련하여 즉시 개선하겠습니다. 더 나은 모습으로 다시 찾아뵙고 싶습니다.",
                f"소중한 의견 감사합니다. 말씀하신 {keywords[0] if keywords else '부분'}은 빠르게 개선하도록 하겠습니다. 다시 한번 사과드립니다."
            ],
            "neutral": [
                "방문해 주셔서 감사합니다 😊 소중한 의견 잘 참고하여 더 나은 서비스로 보답하겠습니다!",
                "피드백 감사드립니다. 고객님의 의견을 바탕으로 지속적으로 개선해 나가겠습니다!"
            ]
        }

        import random
        template_list = templates.get(sentiment, templates["neutral"])
        return random.choice(template_list)
