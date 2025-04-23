<svelte:options immutable={true} />

<script lang="ts">
  import { IconArrowsDiagonalMinimize2, IconArrowsDiagonal, IconX } from '@tabler/icons-svelte'

  export let title = 'Modal'
  export let fullScreenButton: boolean = false
  export let fullscreen: boolean = false
  export let onClose: (() => void) | undefined = undefined
</script>

<div class="jse-header">
  <div class="jse-title">
    {title}
  </div>
  <slot name="actions" />
  {#if fullScreenButton}
    <button
      type="button"
      class="jse-fullscreen"
      title="Toggle full screen"
      on:click={() => (fullscreen = !fullscreen)}
    >
      {#if fullscreen}
        <IconArrowsDiagonalMinimize2 />
      {:else}
        <IconArrowsDiagonal />
      {/if}
    </button>
  {/if}
  <button type="button" class="jse-close" on:click={() => onClose?.()}>
    <IconX />
  </button>
</div>

<style src="./Header.scss"></style>
