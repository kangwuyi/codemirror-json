// source: https://github.com/sveltejs/svelte/issues/7583

let observer: ResizeObserver
let callbacks: WeakMap<Element, (element: Element) => void>

/**
 * Example usage:
 *
 *   <script lang="ts">
 *      let clientWidth = 0
 *   </script>
 *
 *   <div use:resizeObserver={element => clientWidth = element.clientWidth}>
 *      My width is: {clientWidth}
 *   </div>
 */
export function resizeObserver(e: Element, onResize: (element: Element) => void) {
  if (!observer) {
    callbacks = new WeakMap()
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const onResize = callbacks.get(entry.target)
        if (onResize) {
          onResize(entry.target)
        }
      }
    })
  }

  callbacks.set(e, onResize)
  observer.observe(e)

  return {
    destroy: () => {
      callbacks.delete(e)
      observer.unobserve(e)
    },
  }
}
