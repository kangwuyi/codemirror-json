<script lang="ts">
  import type { MenuButton } from '$lib/types'
  import { classnames } from '$lib/utils/cssUtils.js'

  export let item: MenuButton
  export let className: string | undefined = undefined
  export let onRequestClose: () => void
</script>

<button
  type="button"
  class={classnames('jse-context-menu-button', className, item.className)}
  on:click={(event) => {
    onRequestClose()
    item.onClick(event)
  }}
  title={item.title}
  disabled={item.disabled || false}
>
  {#if item.icon}
    <svelte:component this={item.icon} size={16} />
  {/if}
  {#if item.text}
    {item.text}
  {/if}
</button>

<style src="./ContextMenuButton.scss"></style>
