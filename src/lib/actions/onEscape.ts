type Callback = () => void

/**
 * The provided callback is invoked when the user presses Escape, and then stops propagation of the event.
 */
export function onEscape(e: HTMLElement | undefined, callback: Callback) {
  if (!e) return void 0

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      callback()
    }
  }

  e.addEventListener('keydown', handleKeydown)

  return {
    destroy() {
      e.removeEventListener('keydown', handleKeydown)
    },
  }
}
