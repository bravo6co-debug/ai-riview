"""
Supabase 데이터베이스 연결 유틸리티
"""

import os
from supabase import create_client, Client
from typing import Optional


_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Supabase 클라이언트 싱글톤"""
    global _supabase_client

    if _supabase_client is None:
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError("Supabase 환경 변수가 설정되지 않았습니다.")

        _supabase_client = create_client(supabase_url, supabase_key)

    return _supabase_client
