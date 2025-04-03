<svelte:options immutable={true} />

<script lang="ts">
  import type { HistoryItem, History, MenuItem, OnRenderMenuInternal } from '$lib/types'
  import Menu from '../../../controls/Menu.svelte'
  import {
    faEllipsisV,
    faRedo,
    faExpand,
    faSortAmountDownAlt,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import { CONTEXT_MENU_EXPLANATION } from '$lib/constants.js'

  export let containsValidArray: boolean
  export let readOnly: boolean
  export let history: History<HistoryItem>
  export let onSort: () => void
  export let onContextMenu: (event: MouseEvent) => void
  export let onUndo: () => void
  export let onRedo: () => void
  export let onRenderMenu: OnRenderMenuInternal
  export let onOpenEditorModal: () => void
  export let isModalLayer: boolean

  
  let defaultItems: MenuItem[]
  $: defaultItems = !readOnly
    ? [
        {
          type: 'button',
          icon: faSortAmountDownAlt,
          title: 'Sort',
          className: 'jse-sort',
          onClick: onSort,
          disabled: readOnly || !containsValidArray
        },
        {
          type: 'button',
          icon: faEllipsisV,
          title: CONTEXT_MENU_EXPLANATION,
          className: 'jse-contextmenu',
          onClick: onContextMenu
        },
        {
          type: 'separator'
        },
        {
          type: 'button',
          icon: faUndo,
          title: 'Undo (Ctrl+Z)',
          className: 'jse-undo',
          onClick: onUndo,
          disabled: !history.canUndo
        },
        {
          type: 'button',
          icon: faRedo,
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
        {
          type: 'space'
        }
      ]

  let items: MenuItem[]
  $: items = onRenderMenu(defaultItems) || defaultItems
  // header right menu
  let rightItems: MenuItem[]
  $: rightItems =  [{
    type: 'button',
    icon: faExpand,
    title: '全屏',
    className: 'jse-fullscreen',
    onClick: onOpenEditorModal,
    disabled: false
  }]
</script>

<Menu {items} {rightItems} {isModalLayer}/>
