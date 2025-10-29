"""
답글 생성 API 엔드포인트
"""

from http.server import BaseHTTPRequestHandler
import json
import sys
import os
import asyncio

# Python 모듈 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from python.services.ai_service_v2 import AIServiceV2
from python.utils.auth import verify_jwt_token
from python.utils.database import get_supabase_client


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """답글 생성 처리"""
        try:
            # JWT 토큰 검증
            auth_header = self.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                self.send_error_response(401, "인증이 필요합니다.")
                return

            token = auth_header.split('Bearer ')[1]
            try:
                user = verify_jwt_token(token)
            except:
                self.send_error_response(401, "유효하지 않은 토큰입니다.")
                return

            # 요청 본문 읽기
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            review_content = data.get('review_content')
            brand_context = data.get('brand_context', '카페')

            if not review_content or not review_content.strip():
                self.send_error_response(400, "리뷰 내용을 입력해주세요.")
                return

            # AI 서비스 초기화
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                self.send_error_response(500, "OpenAI API 키가 설정되지 않았습니다.")
                return

            supabase = get_supabase_client()
            ai_service = AIServiceV2(
                openai_api_key=openai_api_key,
                supabase_client=supabase
            )

            # 답글 생성 (비동기)
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                ai_service.generate_reply(
                    review_content=review_content,
                    options={
                        "brand_context": brand_context,
                        "user_id": user["id"],
                        "save_to_db": True
                    }
                )
            )
            loop.close()

            if not result.get("success"):
                self.send_error_response(500, result.get("error", "답글 생성 실패"))
                return

            # 성공 응답
            self.send_success_response(result)

        except Exception as e:
            print(f"답글 생성 오류: {e}")
            import traceback
            traceback.print_exc()
            self.send_error_response(500, str(e))

    def send_success_response(self, data):
        """성공 응답"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def send_error_response(self, status_code, message):
        """에러 응답"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            "success": False,
            "error": message
        }, ensure_ascii=False).encode('utf-8'))

    def do_OPTIONS(self):
        """CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
