<svelte:options immutable={true} />

<script lang="ts">
  import LocalCopyIcon from 'codemirror-json/components/icon/copy-solid.svelte'
  import LocalEllipsisVIcon from 'codemirror-json/components/icon/ellipsis-vertical-solid.svelte'
  import LocalRedoIcon from 'codemirror-json/components/icon/rotate-left-solid.svelte'
  import LocalUndoIcon from 'codemirror-json/components/icon/rotate-right-solid.svelte'
  import LocalExpandIcon from 'codemirror-json/components/icon/expand-solid.svelte'
  import LocalExpandWindowIcon from 'codemirror-json/components/icon/expand-window-solid.svelte'
  import LocalCompressIcon from 'codemirror-json/components/icon/compress-solid.svelte'
  import LocalSortAmountDownAltIcon from 'codemirror-json/components/icon/arrow-down-short-wide-solid.svelte'

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
