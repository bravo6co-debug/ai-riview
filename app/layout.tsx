import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '네이버 플레이스 답글 생성기',
  description: 'AI 기반 리뷰 답글 자동 생성 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
