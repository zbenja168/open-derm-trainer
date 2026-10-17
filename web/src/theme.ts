import { useEffect, useState } from 'react'

// 'system' follows the OS; 'light' / 'dark' override it. The choice is a per-viewer convenience, so
// it lives in localStorage; index.html applies it before first paint to avoid a flash.
export type Theme = 'system' | 'light' | 'dark'
const KEY = 'open-derm-trainer/theme'
const ORDER: Theme[] = ['system', 'light', 'dark']

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try {
      if (theme === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, theme)
    } catch {
      /* storage blocked; the choice still applies for this visit */
    }
  }, [theme])
  const cycle = () => setTheme((t) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length])
  return { theme, cycle }
}
