/**
 * Whether enough of an element is on screen to count as already seen. A sliver peeking in at the bottom edge
 * doesn't: it still gets to animate in once it scrolls into view (and on iphones the toolbar collapsing on the
 * first scroll would otherwise uncover it without any animation at all).
 */
export const isOnScreen = (el: Element) => {
  const rect = el.getBoundingClientRect()
  const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)

  return visible > Math.min(rect.height * 0.35, 120)
}
