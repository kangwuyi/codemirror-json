<svelte:options immutable={true} />

<script lang="ts">
  import { IconLock } from '@tabler/icons-svelte'

  import { getContext } from 'svelte'
  import { tooltip } from '$lib/components/controls/tooltip/tooltip.js'
  import type { AbsolutePopupContext } from '$lib/types'

  const absolutePopupContext = getContext<AbsolutePopupContext>('absolute-popup')

  export let value: number

  $: text = `Time: ${new Date(value).toString()}`
</script>

<div class="jse-timestamp" use:tooltip={{ text, ...absolutePopupContext }}>
  <IconClock />
</div>

<style src="./TimestampTag.scss"></style>
