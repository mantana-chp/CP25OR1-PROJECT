import dayjs from 'dayjs'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { IPendingTransfer } from '@/src/domain/pet_transfer.domain'
import { unwrapData } from './pet_sharing_utils'

export const TRANSFER_SCHEME = 'cp25or1-frontend://transfer'
const RESOLVED_TRANSFER_IDS_STORAGE_KEY = 'resolved-transfer-ids'

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

export const getResolvedTransferIdSet = async (): Promise<Set<string>> => {
  try {
    const raw = await AsyncStorage.getItem(RESOLVED_TRANSFER_IDS_STORAGE_KEY)
    if (!raw) {
      return new Set<string>()
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return new Set<string>()
    }

    return new Set(
      parsed
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    )
  } catch {
    return new Set<string>()
  }
}

export const markTransferAsResolved = async (transferId: string) => {
  const normalized = transferId.trim()
  if (!normalized) {
    return
  }

  const currentSet = await getResolvedTransferIdSet()
  currentSet.add(normalized)

  await AsyncStorage.setItem(
    RESOLVED_TRANSFER_IDS_STORAGE_KEY,
    JSON.stringify(Array.from(currentSet)),
  )
}

export const clearResolvedTransferIds = async (transferIds: string[]) => {
  if (transferIds.length === 0) {
    return
  }

  const currentSet = await getResolvedTransferIdSet()

  transferIds.forEach((id) => {
    currentSet.delete(id)
  })

  await AsyncStorage.setItem(
    RESOLVED_TRANSFER_IDS_STORAGE_KEY,
    JSON.stringify(Array.from(currentSet)),
  )
}
