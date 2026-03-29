import type { RecoveryKeyMaterial } from './contracts/security'

const RECOVERY_WORD_BANK = [
  'amber',
  'atlas',
  'branch',
  'copper',
  'delta',
  'ember',
  'forest',
  'harbor',
  'ivory',
  'juniper',
  'ledger',
  'maple',
  'north',
  'orchid',
  'pebble',
  'quartz',
  'river',
  'signal',
  'thistle',
  'velvet',
  'willow',
  'zephyr'
]

export const isValidPin = (pin: string) => /^\d{6,}$/.test(pin)

export const generateRecoveryKey = (): RecoveryKeyMaterial => {
  const code = Array.from({ length: 4 }, () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0').toUpperCase()).join('-')
  const words = Array.from({ length: 6 }, () => RECOVERY_WORD_BANK[Math.floor(Math.random() * RECOVERY_WORD_BANK.length)])
  return { code, words }
}
