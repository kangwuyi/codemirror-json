<svelte:options immutable={true} />

<script lang="ts">
  import LocalDownLeftAndUpRightToCenterIcon from 'codemirror-json/components/icon/down-left-and-up-right-to-center-solid.svelte'
  import LocalUpRightAndDownLeftFromCenterIcon from 'codemirror-json/components/icon/up-right-and-down-left-from-center-solid.svelte'
  import LocalTimesIcon from 'codemirror-json/components/icon/circle-xmark-solid.svelte'

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
        <LocalDownLeftAndUpRightToCenterIcon />
      {:else}
        <LocalUpRightAndDownLeftFromCenterIcon />
      {/if}
    </button>
  {/if}
  <button type="button" class="jse-close" on:click={() => onClose?.()}>
    <LocalTimesIcon />
  </button>
</div>

<style src="./Header.scss"></style>
