<svelte:options immutable={true} />

<script lang="ts">
  import { IconRotate } from '@tabler/icons-svelte'

  export let count: number
  export let maxSampleCount: number
  export let readOnly: boolean
  export let onRefresh: () => void
</script>

<button
  type="button"
  class="jse-column-header"
  class:jse-readonly={readOnly}
  title={`The Columns are created by sampling ${maxSampleCount} items out of ${count}. ` +
    "If you're missing a column, click here to sample all of the items instead of a subset. " +
    'This is slower.'}
  on:click={() => onRefresh()}
>
  <IconRotate size={16} />
</button>

<style src="./RefreshColumnHeader.scss"></style>
