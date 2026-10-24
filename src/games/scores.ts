// best scores live in the visitor's own browser: no accounts, no server, and private windows simply forget

const key = (game: string) => `coupick:best:${game}`

export const readBest = (game: string) => {
  try {
    return Number(localStorage.getItem(key(game))) || 0
  } catch {
    return 0
  }
}

export const saveBest = (game: string, score: number) => {
  try {
    localStorage.setItem(key(game), String(score))
  } catch {
    // storage can be blocked; the score just won't be remembered
  }
}

// a tiny buzz on phones that support it, for eating and for losing
export const buzz = (pattern: number | number[]) => {
  // only phones buzz, and browsers refuse (loudly) before the visitor has touched the page
  if (!window.matchMedia('(pointer: coarse)').matches || navigator.userActivation?.hasBeenActive === false) {
    return
  }

  try {
    navigator.vibrate?.(pattern)
  } catch {
    // not every browser lets a page vibrate
  }
}
