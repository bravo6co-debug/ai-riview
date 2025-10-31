// 업종 (Business Type) 옵션
export const BUSINESS_TYPES = [
  { value: 'cafe', label: '카페' },
  { value: 'restaurant_korean', label: '한식당' },
  { value: 'restaurant_chinese', label: '중식당' },
  { value: 'restaurant_japanese', label: '일식당' },
  { value: 'restaurant_western', label: '양식당' },
  { value: 'restaurant_buffet', label: '뷔페' },
  { value: 'bakery', label: '베이커리' },
  { value: 'dessert', label: '디저트' },
  { value: 'fastfood', label: '패스트푸드' },
  { value: 'bar', label: '술집/바' },
  { value: 'salon', label: '미용실' },
  { value: 'nail', label: '네일샵' },
  { value: 'spa', label: '스파/마사지' },
  { value: 'fitness', label: '헬스장/PT' },
  { value: 'hospital', label: '병원' },
  { value: 'dental', label: '치과' },
  { value: 'hotel', label: '숙박/호텔' },
  { value: 'retail', label: '소매점' },
  { value: 'other', label: '기타' },
] as const

// 브랜드 톤앤매너 (Brand Tone) 옵션
export const BRAND_TONES = [
  {
    value: 'friendly',
    label: '친근한',
    description: '편안하고 다정한 말투',
  },
  {
    value: 'professional',
    label: '전문적인',
    description: '정중하고 격식 있는 말투',
  },
  {
    value: 'casual',
    label: '캐주얼한',
    description: '가볍고 부담 없는 말투',
  },
  {
    value: 'warm',
    label: '따뜻한',
    description: '진심 어린 감사와 배려',
  },
  {
    value: 'energetic',
    label: '활기찬',
    description: '밝고 긍정적인 에너지',
  },
  {
    value: 'luxury',
    label: '고급스러운',
    description: '품격 있고 세련된 표현',
  },
  {
    value: 'minimalist',
    label: '미니멀',
    description: '간결하고 핵심만 전달',
  },
] as const

// 톤앤매너별 가이드 텍스트
export const TONE_GUIDES: Record<string, string> = {
  friendly: '편안하고 다정한 말투로 작성하세요. 고객과의 친밀감을 느낄 수 있도록 따뜻한 표현을 사용하세요.',
  professional: '정중하고 격식 있는 말투로 작성하세요. 신뢰감을 주는 전문적인 어조를 유지하세요.',
  casual: '가볍고 부담 없는 말투로 작성하세요. 편안하면서도 친근한 분위기를 연출하세요.',
  warm: '진심 어린 감사와 배려가 느껴지도록 작성하세요. 고객의 마음을 따뜻하게 감싸는 표현을 사용하세요.',
  energetic: '밝고 긍정적인 에너지가 느껴지도록 작성하세요. 활기차고 열정적인 분위기를 전달하세요.',
  luxury: '품격 있고 세련된 표현을 사용하세요. 고급스러운 서비스를 제공하는 브랜드의 이미지를 유지하세요.',
  minimalist: '간결하고 핵심만 전달하세요. 불필요한 수식어 없이 명확하게 전달하세요.',
}

// 업종별 라벨 매핑
export const getBusinessTypeLabel = (value: string): string => {
  const type = BUSINESS_TYPES.find((t) => t.value === value)
  return type?.label || value
}

// 톤앤매너 라벨 매핑
export const getBrandToneLabel = (value: string): string => {
  const tone = BRAND_TONES.find((t) => t.value === value)
  return tone?.label || value
}

// 톤앤매너 가이드 가져오기
export const getToneGuide = (value: string): string => {
  return TONE_GUIDES[value] || TONE_GUIDES.friendly
}
