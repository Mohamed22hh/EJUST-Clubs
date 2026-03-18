import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ejust-dark-mode'

function getInitialDark(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return stored === 'true'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Module-level singleton — one listener, shared across all hook consumers
let _isDark = getInitialDark()
const _listeners = new Set<(dark: boolean) => void>()

function applyDark(dark: boolean) {
  _isDark = dark
  localStorage.setItem(STORAGE_KEY, String(dark))
  document.documentElement.classList.toggle('dark', dark)
  _listeners.forEach(fn => fn(dark))
}

// Apply immediately on module load
if (typeof window !== 'undefined') {
  document.documentElement.classList.toggle('dark', _isDark)
  // Follow OS changes only when user hasn't manually overridden
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem(STORAGE_KEY) === null) applyDark(e.matches)
  })
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(_isDark)

  useEffect(() => {
    _listeners.add(setIsDark)
    return () => { _listeners.delete(setIsDark) }
  }, [])

  return { isDark, toggle: () => applyDark(!_isDark) }
}
