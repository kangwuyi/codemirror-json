<svelte:options immutable={true} />

<script lang="ts">
  import LocalRedoIcon from '../../../icon/rotate-left-solid.svelte'
  import LocalUndoIcon from '../../../icon/rotate-right-solid.svelte'
  import LocalExpandWindowIcon from '../../../icon/expand-window-solid.svelte'
  import LocalSortAmountDownAltIcon from '../../../icon/arrow-down-short-wide-solid.svelte'
  import LocalFormatIcon from '../../../icon/expand-solid.svelte'
  import LocalCompactIcon from '../../../icon/expand-solid.svelte'

  import Menu from '../../../controls/Menu.svelte'
  import type { MenuItem, OnRenderMenuInternal } from '$lib/types'

  export let readOnly = false
  export let onFormat: () => boolean
  export let onCompact: () => boolean
  export let onSort: () => void
  export let onUndo: () => void
  export let onRedo: () => void
  export let canUndo: boolean
  export let canRedo: boolean
  export let canFormat: boolean
  export let canCompact: boolean
  export let canSort: boolean
  export let onRenderMenu: OnRenderMenuInternal
  export let onOpenEditorModal: () => void
  export let isModalLayer: boolean

  let defaultItems: MenuItem[]
  $: defaultItems = !readOnly
    ? [
        {
          type: 'button',
          icon: LocalFormatIcon,
          title: 'Format JSON: add proper indentation and new lines (Ctrl+I)',
          className: 'jse-format',
          onClick: onFormat,
          disabled: readOnly || !canFormat
        },
        {
          type: 'button',
          icon: LocalCompactIcon,
          title: 'Compact JSON: remove all white spacing and new lines (Ctrl+Shift+I)',
          className: 'jse-compact',
          onClick: onCompact,
          disabled: readOnly || !canCompact
        },
        {
          type: 'separator'
        },
        {
          type: 'button',
          icon: LocalSortAmountDownAltIcon,
          title: 'Sort',
          className: 'jse-sort',
          onClick: onSort,
          disabled: readOnly || !canSort
        },
        {
          type: 'separator'
        },
        {
          type: 'button',
          icon: LocalUndoIcon,
          title: 'Undo (Ctrl+Z)',
          className: 'jse-undo',
          onClick: onUndo,
          disabled: !canUndo
        },
        {
          type: 'button',
          icon: LocalRedoIcon,
          title: 'Redo (Ctrl+Shift+Z)',
          className: 'jse-redo',
          onClick: onRedo,
          disabled: !canRedo
        },
        {
          type: 'space'
        }
      ]
    : [
        {
          type: 'space'
        }
      ]

  // eslint-disable-next-line svelte/no-unused-svelte-ignore
  // svelte-ignore reactive_declaration_non_reactive_property
  $: items = onRenderMenu(defaultItems) || defaultItems

  // header right menu
  let rightItems: MenuItem[]
  $: rightItems = [
    {
      type: 'button',
      icon: LocalExpandWindowIcon,
      title: '全屏',
      className: 'jse-fullscreen',
      onClick: onOpenEditorModal,
      disabled: false
    }
  ]
</script>

<Menu {items} {rightItems} {isModalLayer} />
