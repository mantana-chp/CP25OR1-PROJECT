import dayjs from 'dayjs'

import { IPendingTransfer } from '@/src/domain/pet_transfer.domain'
import { unwrapData } from './pet_sharing_utils'

export const TRANSFER_SCHEME = 'cp25or1-frontend://transfer'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const extractTransferToken = (rawValue: string): string | null => {
  const value = rawValue.trim()
  if (!value) return null

  if (UUID_PATTERN.test(value)) {
    return value
  }

  const deepLinkPrefix = `${TRANSFER_SCHEME}/`
  if (value.startsWith(deepLinkPrefix)) {
    const token = value.slice(deepLinkPrefix.length).trim()
    return UUID_PATTERN.test(token) ? token : null
  }

  const transferLinkMatch = value.match(/\/transfer\/([0-9a-f-]{36})/i)
  if (transferLinkMatch?.[1] && UUID_PATTERN.test(transferLinkMatch[1])) {
    return transferLinkMatch[1]
  }

  return null
}

export const formatTransferExpiresIn = (expiresAt: string) => {
  const expires = dayjs(expiresAt)
  const now = dayjs()

  if (!expires.isValid()) return '-'
  if (expires.isBefore(now)) return 'หมดอายุแล้ว'

  const hours = expires.diff(now, 'hour')
  if (hours >= 1) {
    return `หมดอายุใน ${hours} ชั่วโมง`
  }

  const minutes = Math.max(1, expires.diff(now, 'minute'))
  return `หมดอายุใน ${minutes} นาที`
}

export const unwrapPendingTransfers = (
  payload: unknown,
): IPendingTransfer[] => {
  const raw = unwrapData<
    IPendingTransfer[] | { pendingTransfers?: IPendingTransfer[] }
  >(payload)

  if (Array.isArray(raw)) {
    return raw
  }

  if (Array.isArray(raw?.pendingTransfers)) {
    return raw.pendingTransfers
  }

  return []
}
