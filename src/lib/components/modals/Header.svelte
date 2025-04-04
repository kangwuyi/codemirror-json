<svelte:options immutable={true} />

<script lang="ts">
  import LocalDownLeftAndUpRightToCenterIcon from '$lib/assets/icon/down-left-and-up-right-to-center-solid.svg?raw'
  import LocalUpRightAndDownLeftFromCenterIcon from '$lib/assets/icon/up-right-and-down-left-from-center-solid.svg?raw'
  import LocalTimesIcon from '$lib/assets/icon/circle-xmark-solid.svg?raw'

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
      {@html fullscreen
        ? LocalDownLeftAndUpRightToCenterIcon
        : LocalUpRightAndDownLeftFromCenterIcon}
    </button>
  {/if}
  <button type="button" class="jse-close" on:click={() => onClose?.()}>
    {@html LocalTimesIcon}
  </button>
</div>

<style src="./Header.scss"></style>
