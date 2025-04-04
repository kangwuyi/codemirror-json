<svelte:options immutable={true} />

<script lang="ts">
  import LocalCopyIcon from '$lib/assets/icon/copy-solid.svelte'
  import LocalEllipsisVIcon from '$lib/assets/icon/ellipsis-vertical-solid.svelte'
  import LocalRedoIcon from '$lib/assets/icon/rotate-left-solid.svelte'
  import LocalUndoIcon from '$lib/assets/icon/rotate-right-solid.svelte'
  import LocalExpandIcon from '$lib/assets/icon/expand-solid.svelte'
  import LocalExpandWindowIcon from '$lib/assets/icon/expand-window-solid.svelte'
  import LocalCompressIcon from '$lib/assets/icon/compress-solid.svelte'
  import LocalSortAmountDownAltIcon from '$lib/assets/icon/arrow-down-short-wide-solid.svelte'

  import { CONTEXT_MENU_EXPLANATION } from '$lib/constants.js'

  import { isObjectOrArray } from '$lib/utils/typeUtils.js'
  import Menu from '../../../controls/Menu.svelte'
  import type {
    HistoryItem,
    History,
    JSONSelection,
    MenuItem,
    OnRenderMenuInternal
  } from '$lib/types'
  import { isKeySelection, isMultiSelection, isValueSelection } from '$lib/logic/selection.js'

  export let json: unknown
  export let selection: JSONSelection | undefined

  export let readOnly: boolean
  export let history: History<HistoryItem>

  export let onExpandAll: () => void
  export let onCollapseAll: () => void
  export let onUndo: () => void
  export let onRedo: () => void
  export let onSort: () => void
  export let onContextMenu: (event: MouseEvent) => void
  export let onCopy: () => void
  export let onRenderMenu: OnRenderMenuInternal
  export let onOpenEditorModal: () => void
  export let isModalLayer: boolean

  $: hasJson = json !== undefined
  $: hasSelectionContents =
    hasJson &&
    (isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection))

  let expandMenuItem: MenuItem
  $: expandMenuItem = {
    type: 'button',
    icon: LocalExpandIcon,
    title: 'Expand all',
    className: 'jse-expand-all',
    onClick: onExpandAll,
    disabled: !isObjectOrArray(json)
  }

  let collapseMenuItem: MenuItem
  $: collapseMenuItem = {
    type: 'button',
    icon: LocalCompressIcon,
    title: 'Collapse all',
    className: 'jse-collapse-all',
    onClick: onCollapseAll,
    disabled: !isObjectOrArray(json)
  }

  let defaultItems: MenuItem[]
  $: defaultItems = !readOnly
    ? [
        expandMenuItem,
        collapseMenuItem,
        {
          type: 'separator'
        },
        {
          type: 'button',
          icon: LocalSortAmountDownAltIcon,
          title: 'Sort',
          className: 'jse-sort',
          onClick: onSort,
          disabled: readOnly || json === undefined
        },
        {
          type: 'button',
          icon: LocalEllipsisVIcon,
          title: CONTEXT_MENU_EXPLANATION,
          className: 'jse-contextmenu',
          onClick: onContextMenu
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
          disabled: !history.canUndo
        },
        {
          type: 'button',
          icon: LocalRedoIcon,
          title: 'Redo (Ctrl+Shift+Z)',
          className: 'jse-redo',
          onClick: onRedo,
          disabled: !history.canRedo
        },
        {
          type: 'space'
        }
      ]
    : [
        expandMenuItem,
        collapseMenuItem,
        {
          type: 'separator'
        },
        {
          type: 'button',
          icon: LocalCopyIcon,
          title: 'Copy (Ctrl+C)',
          className: 'jse-copy',
          onClick: onCopy,
          disabled: !hasSelectionContents
        },
        {
          type: 'separator'
        },
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
