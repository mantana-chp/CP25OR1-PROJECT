import dayjs from 'dayjs'

export const CLAIM_SCHEME = 'cp25or1-frontend://claim'
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const extractClaimToken = (rawValue: string): string | null => {
  const value = rawValue.trim()
  if (!value) return null

  if (UUID_PATTERN.test(value)) {
    return value
  }

  const deepLinkPrefix = `${CLAIM_SCHEME}/`
  if (value.startsWith(deepLinkPrefix)) {
    const token = value.slice(deepLinkPrefix.length).trim()
    return UUID_PATTERN.test(token) ? token : null
  }

  const match = value.match(/\/claim\/([0-9a-f-]{36})/i)
  if (!match?.[1]) {
    return null
  }

  const token = match[1]
  return UUID_PATTERN.test(token) ? token : null
}

export const unwrapData = <T>(payload: unknown): T | null => {
  const raw = payload as any
  return (raw?.data?.data ?? raw?.data ?? null) as T | null
}

export const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'CG'

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

export const formatExpiresIn = (expiresAt: string) => {
  const expires = dayjs(expiresAt)
  const now = dayjs()

  if (!expires.isValid()) return '-'
  if (expires.isBefore(now)) return 'หมดอายุแล้ว'

  const hours = expires.diff(now, 'hour')
  if (hours >= 1) return `หมดอายุใน ${hours} ชั่วโมง`

  const minutes = Math.max(1, expires.diff(now, 'minute'))
  return `หมดอายุใน ${minutes} นาที`
}
