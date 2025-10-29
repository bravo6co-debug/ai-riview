import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // CORS 헤더 설정
  const response = NextResponse.next()

  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // OPTIONS 요청 처리
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  return response
}

// API 라우트에만 적용 - Next.js matcher 패턴
// /api로 시작하는 모든 경로에 적용
export const config = {
  matcher: ['/api/:path*'],
}
