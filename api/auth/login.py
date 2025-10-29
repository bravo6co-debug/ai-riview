"""
로그인 API 엔드포인트
"""

from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# Python 모듈 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from python.utils.auth import verify_password, create_access_token
from python.utils.database import get_supabase_client


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """로그인 처리"""
        try:
            # 요청 본문 읽기
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            username = data.get('username')
            password = data.get('password')

            if not username or not password:
                self.send_error_response(400, "아이디와 비밀번호를 입력해주세요.")
                return

            # Supabase에서 사용자 조회
            supabase = get_supabase_client()
            result = supabase.table("users")\
                .select("*")\
                .eq("username", username)\
                .execute()

            if not result.data or len(result.data) == 0:
                self.send_error_response(401, "아이디 또는 비밀번호가 잘못되었습니다.")
                return

            user = result.data[0]

            # 비밀번호 검증
            if not verify_password(password, user['password_hash']):
                self.send_error_response(401, "아이디 또는 비밀번호가 잘못되었습니다.")
                return

            # 마지막 로그인 시간 업데이트
            supabase.table("users")\
                .update({"last_login": "NOW()"})\
                .eq("id", user['id'])\
                .execute()

            # JWT 토큰 생성
            token = create_access_token({
                "id": user['id'],
                "username": user['username'],
                "is_admin": user['is_admin']
            })

            # 성공 응답
            self.send_success_response({
                "success": True,
                "token": token,
                "user": {
                    "id": user['id'],
                    "username": user['username'],
                    "is_admin": user['is_admin']
                }
            })

        except Exception as e:
            print(f"로그인 오류: {e}")
            self.send_error_response(500, str(e))

    def send_success_response(self, data):
        """성공 응답"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_response(self, status_code, message):
        """에러 응답"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            "success": False,
            "error": message
        }).encode('utf-8'))

    def do_OPTIONS(self):
        """CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
