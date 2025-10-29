"""
3단계 하이브리드 감정 분석 엔진
1단계: 룰 기반 빠른 분석 (키워드 매칭)
2단계: 한국어 특화 주제/키워드 추출
3단계: AI 정밀 분석 (조건부 - 부정리뷰/복잡한리뷰)
"""

import hashlib
import json
from typing import Dict, List, Optional
from openai import OpenAI
import time


class SentimentAnalyzer:
    """감정 분석 엔진"""

    def __init__(self, openai_api_key: str, supabase_client=None):
        self.client = OpenAI(api_key=openai_api_key)
        self.supabase = supabase_client

        # 감정 키워드 사전 (문서 로직 그대로)
        self.sentiment_keywords = {
            "positive": {
                "strong": ["최고", "완벽", "훌륭", "감동", "환상", "대박", "짱", "끝내주"],
                "medium": ["맛있", "좋아", "친절", "깨끗", "추천", "만족", "괜찮", "훌륭"],
                "weak": ["나쁘지않", "그럭저럭", "무난", "괜찮은"]
            },
            "negative": {
                "strong": ["최악", "끔찍", "환불", "신고", "쓰레기", "형편없", "먹을수없"],
                "medium": ["별로", "실망", "불만", "후회", "아쉬", "불친절", "맛없"],
                "weak": ["조금", "약간", "다소", "살짝"]
            }
        }

        # 주제 카테고리 (문서 로직 그대로)
        self.topic_categories = {
            "맛/품질": {
                "keywords": ["맛", "음식", "요리", "신선", "재료", "식재료", "품질", "간"],
                "positive": ["맛있", "신선", "푸짐", "고소", "달콤", "깔끔한맛"],
                "negative": ["맛없", "식은", "상한", "짜", "싱거", "비린"]
            },
            "서비스": {
                "keywords": ["직원", "알바", "응대", "태도", "서비스", "사장", "주인"],
                "positive": ["친절", "빠른", "정중", "상냥", "세심"],
                "negative": ["불친절", "느린", "무례", "퉁명", "무시"]
            },
            "분위기/시설": {
                "keywords": ["인테리어", "좌석", "공간", "분위기", "시설", "화장실", "테이블"],
                "positive": ["깔끔", "아늑", "넓은", "예쁜", "세련"],
                "negative": ["낡은", "불편", "좁은", "지저분", "어둡"]
            },
            "청결": {
                "keywords": ["위생", "깨끗", "냄새", "청결", "더러", "지저분"],
                "positive": ["청결", "깨끗", "위생적"],
                "negative": ["더럽", "지저분", "벌레", "곰팡이", "냄새"]
            },
            "가격": {
                "keywords": ["가격", "가성비", "비용", "돈", "값", "비싸", "저렴"],
                "positive": ["저렴", "합리적", "가성비", "착한가격"],
                "negative": ["비싸", "바가지", "비쌈", "부담"]
            },
            "대기시간": {
                "keywords": ["대기", "기다림", "시간", "웨이팅", "줄"],
                "positive": ["빠른", "신속", "회전"],
                "negative": ["느린", "오래", "늦", "지연"]
            }
        }

        # 증폭 표현
        self.amplifiers = ["너무", "정말", "진짜", "완전", "엄청", "매우", "아주"]

    async def analyze(self, content: str) -> Dict:
        """통합 감정 분석"""
        start_time = time.time()

        # 캐시 확인 (SHA-256 해시)
        cached = await self._check_cache(content)
        if cached:
            cached["analysis_source"] = "cache"
            return cached

        # 1단계: 룰 기반 빠른 분석
        quick_result = self._quick_sentiment_analysis(content)

        # 2단계: 주제 및 키워드 추출
        topic_result = self._extract_topics_and_keywords(content)

        # 3단계: AI 정밀 분석 여부 결정 (문서 로직 그대로)
        needs_deep_analysis = (
            quick_result["sentiment"] == "negative" or  # 부정 리뷰는 항상
            len(content) > 100 or                        # 긴 리뷰
            len(topic_result["topics"]) > 2 or           # 여러 주제
            quick_result["confidence"] < 0.7             # 낮은 신뢰도
        )

        if needs_deep_analysis:
            analysis = await self._deep_analysis_with_ai(content, quick_result, topic_result)
        else:
            analysis = self._build_fallback_analysis(content, quick_result, topic_result)

        # 분석 시간 추가
        analysis["analysis_time_ms"] = int((time.time() - start_time) * 1000)

        # 캐시 저장
        await self._save_to_cache(content, analysis)

        return analysis

    def _quick_sentiment_analysis(self, content: str) -> Dict:
        """1단계: 룰 기반 빠른 감정 분석 (문서 알고리즘 그대로)"""
        positive_score = 0
        negative_score = 0

        # 키워드 스코어링
        for strength, keywords in self.sentiment_keywords["positive"].items():
            weight = {"strong": 3, "medium": 2, "weak": 1}[strength]
            for keyword in keywords:
                positive_score += content.count(keyword) * weight

        for strength, keywords in self.sentiment_keywords["negative"].items():
            weight = {"strong": 3, "medium": 2, "weak": 1}[strength]
            for keyword in keywords:
                negative_score += content.count(keyword) * weight

        # 증폭 표현 감지
        has_amplifier = any(amp in content for amp in self.amplifiers)
        if has_amplifier and negative_score > 0:
            negative_score *= 1.5

        # 감정 결정 및 신뢰도 계산 (문서 로직)
        total_score = positive_score + negative_score
        if total_score == 0:
            sentiment, confidence = "neutral", 0.5
        elif positive_score > negative_score * 1.5:
            sentiment = "positive"
            confidence = 0.6 + (positive_score / total_score) * 0.35
        elif negative_score > positive_score * 1.5:
            sentiment = "negative"
            confidence = 0.6 + (negative_score / total_score) * 0.35
        else:
            sentiment, confidence = "neutral", 0.5

        return {
            "sentiment": sentiment,
            "confidence": min(confidence, 0.95),
            "scores": {
                "positive": positive_score,
                "negative": negative_score
            }
        }

    def _extract_topics_and_keywords(self, content: str) -> Dict:
        """2단계: 한국어 특화 주제 및 키워드 추출"""
        detected_topics = []
        all_keywords = []
        issues = []

        # 주제 감지
        for topic_name, topic_data in self.topic_categories.items():
            # 키워드 매칭
            topic_matches = sum(1 for kw in topic_data["keywords"] if kw in content)

            if topic_matches > 0:
                # 주제별 감정 판단
                positive_count = sum(1 for kw in topic_data["positive"] if kw in content)
                negative_count = sum(1 for kw in topic_data["negative"] if kw in content)

                topic_sentiment = "positive" if positive_count > negative_count else (
                    "negative" if negative_count > positive_count else "neutral"
                )

                detected_topics.append({
                    "topic": topic_name,
                    "sentiment": topic_sentiment,
                    "score": topic_matches,
                    "keywords": [kw for kw in topic_data["keywords"] if kw in content]
                })

                # 키워드 수집
                all_keywords.extend([kw for kw in topic_data["keywords"] if kw in content])

                # 이슈 탐지
                if topic_sentiment == "negative":
                    negative_keywords = [kw for kw in topic_data["negative"] if kw in content]
                    for kw in negative_keywords:
                        issues.append({
                            "topic": topic_name,
                            "keyword": kw,
                            "type": "negative"
                        })

        # 주제를 스코어 순으로 정렬
        detected_topics.sort(key=lambda x: x["score"], reverse=True)

        # 중복 제거 및 상위 5개 키워드만
        unique_keywords = list(dict.fromkeys(all_keywords))[:5]

        return {
            "topics": detected_topics[:3],  # 최대 3개
            "keywords": unique_keywords,
            "issues": issues
        }

    async def _deep_analysis_with_ai(self, content: str, quick_result: Dict, topic_result: Dict) -> Dict:
        """3단계: AI 정밀 분석 (문서 프롬프트 그대로)"""
        prompt = f"""다음 고객 리뷰를 정밀 분석해주세요:

리뷰: "{content}"

분석 항목:
1. 전체 감정 (positive/negative/neutral)
2. 감정 강도 (0.0 ~ 1.0)
3. 주요 주제 (최대 3개)
4. 핵심 키워드 (최대 5개)
5. 고객 의도 (칭찬/불만/제안/문의)
6. 답글 강조 포인트 (구체적으로)
7. 답글 피해야 할 요소

JSON 형식으로만 응답하세요:
{{
  "sentiment": "positive|negative|neutral",
  "sentiment_strength": 0.85,
  "topics": ["주제1", "주제2"],
  "keywords": ["키워드1", "키워드2"],
  "intent": "칭찬|불만|제안|문의",
  "reply_focus": ["포인트1", "포인트2"],
  "reply_avoid": ["피할요소1", "피할요소2"],
  "summary": "한줄 요약"
}}"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 고객 리뷰 분석 전문가입니다. JSON 형식으로만 응답하세요."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500,
                response_format={"type": "json_object"}
            )

            ai_result = json.loads(response.choices[0].message.content)

            return {
                "success": True,
                "sentiment": ai_result.get("sentiment", quick_result["sentiment"]),
                "sentiment_strength": ai_result.get("sentiment_strength", quick_result["confidence"]),
                "topics": [t if isinstance(t, str) else t.get("topic", "") for t in ai_result.get("topics", [t["topic"] for t in topic_result["topics"]])],
                "keywords": ai_result.get("keywords", topic_result["keywords"]),
                "intent": ai_result.get("intent", "일반"),
                "reply_focus": ai_result.get("reply_focus", []),
                "reply_avoid": ai_result.get("reply_avoid", []),
                "summary": ai_result.get("summary", ""),
                "analysis_depth": "deep",
                "analysis_source": "ai",
                "model_used": "gpt-4o-mini",
                "details": {
                    "quick_scores": quick_result["scores"],
                    "detected_topics": topic_result["topics"],
                    "issues": topic_result["issues"]
                }
            }
        except Exception as e:
            print(f"AI 분석 실패: {e}")
            return self._build_fallback_analysis(content, quick_result, topic_result)

    def _build_fallback_analysis(self, content: str, quick_result: Dict, topic_result: Dict) -> Dict:
        """AI 호출 없이 룰 기반 결과 조합"""
        # 의도 추론
        sentiment = quick_result["sentiment"]
        if sentiment == "positive":
            intent = "칭찬"
            reply_focus = ["구체적인 칭찬 포인트 감사", "지속적인 품질 약속"]
            reply_avoid = ["형식적인 답변", "과도한 마케팅"]
        elif sentiment == "negative":
            intent = "불만"
            reply_focus = ["진심 어린 사과", "구체적 개선 약속"]
            reply_avoid = ["변명", "책임 회피"]
        else:
            intent = "일반"
            reply_focus = ["방문 감사", "개선 의지"]
            reply_avoid = ["무성의한 답변"]

        return {
            "success": True,
            "sentiment": sentiment,
            "sentiment_strength": quick_result["confidence"],
            "topics": [t["topic"] for t in topic_result["topics"]],
            "keywords": topic_result["keywords"],
            "intent": intent,
            "reply_focus": reply_focus,
            "reply_avoid": reply_avoid,
            "summary": f"{sentiment} 리뷰 - {', '.join([t['topic'] for t in topic_result['topics'][:2]])}",
            "analysis_depth": "quick",
            "analysis_source": "rule-based",
            "model_used": "none",
            "details": {
                "quick_scores": quick_result["scores"],
                "detected_topics": topic_result["topics"],
                "issues": topic_result["issues"]
            }
        }

    async def _check_cache(self, content: str) -> Optional[Dict]:
        """캐시 확인"""
        if not self.supabase:
            return None

        try:
            content_hash = hashlib.sha256(content.encode()).hexdigest()

            result = self.supabase.table("sentiment_analysis_cache")\
                .select("*")\
                .eq("content_hash", content_hash)\
                .execute()

            if result.data and len(result.data) > 0:
                cache_data = result.data[0]

                # 히트 카운트 증가
                self.supabase.table("sentiment_analysis_cache")\
                    .update({
                        "hit_count": cache_data["hit_count"] + 1,
                        "last_used_at": "NOW()"
                    })\
                    .eq("content_hash", content_hash)\
                    .execute()

                return {
                    "success": True,
                    "sentiment": cache_data["sentiment"],
                    "sentiment_strength": float(cache_data["sentiment_strength"]) if cache_data["sentiment_strength"] else 0.5,
                    "topics": cache_data["topics"] or [],
                    "keywords": cache_data["keywords"] or [],
                    "intent": cache_data["intent"] or "일반",
                    "reply_focus": cache_data["reply_focus"] or [],
                    "reply_avoid": cache_data["reply_avoid"] or [],
                    "summary": cache_data["summary"] or "",
                    "analysis_depth": "cache",
                    "analysis_source": "cache",
                    "model_used": cache_data["analysis_model"] or "cache"
                }
        except Exception as e:
            print(f"캐시 조회 실패: {e}")

        return None

    async def _save_to_cache(self, content: str, analysis: Dict):
        """캐시 저장"""
        if not self.supabase:
            return

        try:
            content_hash = hashlib.sha256(content.encode()).hexdigest()
            content_preview = content[:100] if len(content) > 100 else content

            cache_data = {
                "content_hash": content_hash,
                "content_preview": content_preview,
                "sentiment": analysis["sentiment"],
                "sentiment_strength": analysis["sentiment_strength"],
                "topics": json.dumps(analysis["topics"]) if isinstance(analysis["topics"], list) else analysis["topics"],
                "keywords": json.dumps(analysis["keywords"]) if isinstance(analysis["keywords"], list) else analysis["keywords"],
                "intent": analysis.get("intent", "일반"),
                "reply_focus": json.dumps(analysis.get("reply_focus", [])),
                "reply_avoid": json.dumps(analysis.get("reply_avoid", [])),
                "summary": analysis.get("summary", ""),
                "analysis_model": analysis.get("model_used", "unknown"),
                "hit_count": 0,
                "last_used_at": "NOW()"
            }

            # Upsert (insert or update)
            self.supabase.table("sentiment_analysis_cache")\
                .upsert(cache_data, on_conflict="content_hash")\
                .execute()
        except Exception as e:
            print(f"캐시 저장 실패: {e}")
