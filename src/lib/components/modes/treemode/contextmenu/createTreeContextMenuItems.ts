import LocalArrowRightArrowLeftIcon from '$lib/assets/icon/arrow-right-arrow-left-solid.svelte'
import LocalCaretSquareDownIcon from '$lib/assets/icon/square-caret-down-solid.svelte'
import LocalCaretSquareUpIcon from '$lib/assets/icon/square-caret-up-solid.svelte'
import LocalCheckSquareIcon from '$lib/assets/icon/square-check-solid.svelte'
import LocalCloneIcon from '$lib/assets/icon/clone-solid.svelte'
import LocalCopyIcon from '$lib/assets/icon/copy-solid.svelte'
import LocalCropAltIcon from '$lib/assets/icon/crop-solid.svelte'
import LocalCutIcon from '$lib/assets/icon/scissors-solid.svelte'
import LocalPasteIcon from '$lib/assets/icon/paste-solid.svelte'
import LocalPenIcon from '$lib/assets/icon/pen-solid.svelte'
import LocalPlusIcon from '$lib/assets/icon/plus-solid.svelte'
import LocalSortAmountDownAltIcon from '$lib/assets/icon/arrow-down-short-wide-solid.svelte'
import LocalSquareIcon from '$lib/assets/icon/square-solid.svelte'
import LocalTrashCanIcon from '$lib/assets/icon/trash-can-solid.svelte'

import {
  canConvert,
  getFocusPath,
  isAfterSelection,
  isInsideSelection,
  isKeySelection,
  isMultiSelection,
  isValueSelection,
  singleItemSelected
} from '$lib/logic/selection'
import type {
  ConvertType,
  DocumentState,
  InsertType,
  JSONSelection,
  ContextMenuItem
} from '$lib/types'
import { initial, isEmpty } from 'lodash-es'
import { getIn } from 'immutable-json-patch'
import { isObject, isObjectOrArray } from '$lib/utils/typeUtils'
import { getEnforceString } from '$lib/logic/documentState'

export default function ({
  json,
  documentState,
  selection,
  readOnly,
  onEditKey,
  onEditValue,
  onToggleEnforceString,
  onCut,
  onCopy,
  onPaste,
  onRemove,
  onDuplicate,
  onExtract,
  onInsertBefore,
  onInsert,
  onConvert,
  onInsertAfter,
  onSort
}: {
  json: unknown
  documentState: DocumentState | undefined
  selection: JSONSelection | undefined
  readOnly: boolean
  onEditKey: () => void
  onEditValue: () => void
  onToggleEnforceString: () => void
  onCut: (indent: boolean) => void
  onCopy: (indent: boolean) => void
  onPaste: () => void
  onRemove: () => void
  onDuplicate: () => void
  onExtract: () => void
  onInsertBefore: () => void
  onInsert: (type: InsertType) => void
  onConvert: (type: ConvertType) => void
  onInsertAfter: () => void
  onSort: () => void
}): ContextMenuItem[] {
  const hasJson = json !== undefined
  const hasSelection = !!selection
  const rootSelected = selection ? isEmpty(getFocusPath(selection)) : false
  // @focusValue 判断选中区域类型
  // 判断数组 Array.isArray(focusValue)
  // 判断对象 isObject(focusValue)
  const focusValue = selection ? getIn(json, getFocusPath(selection)) : undefined

  const hasSelectionContents =
    hasJson &&
    (isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection))

  const parent =
    selection && !rootSelected ? getIn(json, initial(getFocusPath(selection))) : undefined

  const canEditKey =
    !readOnly && hasJson && singleItemSelected(selection) && !rootSelected && !Array.isArray(parent)

  const canEditValue =
    !readOnly && hasJson && selection !== undefined && singleItemSelected(selection)
  const canEnforceString = canEditValue && !isObjectOrArray(focusValue)

  const canCut = !readOnly && hasSelectionContents
  const canCopy = hasSelectionContents
  const canPaste = !readOnly && hasSelection
  const canDuplicate = !readOnly && hasJson && hasSelectionContents && !rootSelected // must not be root
  const canExtract =
    !readOnly &&
    hasJson &&
    selection !== undefined &&
    (isMultiSelection(selection) || isValueSelection(selection)) &&
    !rootSelected // must not be root

  const convertMode = hasSelectionContents
  const insertOrConvertText = convertMode ? '转换为:' : '插入:'

  const canInsertOrConvertStructure =
    !readOnly &&
    ((isInsideSelection(selection) && Array.isArray(focusValue)) ||
      (isAfterSelection(selection) && Array.isArray(parent)))
  const canInsertOrConvertObject =
    !readOnly && (convertMode ? canConvert(selection) && !isObject(focusValue) : hasSelection)
  const canInsertOrConvertArray =
    !readOnly && (convertMode ? canConvert(selection) && !Array.isArray(focusValue) : hasSelection)
  const canInsertOrConvertValue =
    !readOnly && (convertMode ? canConvert(selection) && isObjectOrArray(focusValue) : hasSelection)

  const enforceString =
    selection !== undefined ? getEnforceString(json, documentState, getFocusPath(selection)) : false

  function handleInsertOrConvert(type: InsertType) {
    if (hasSelectionContents) {
      if (type !== 'structure') {
        onConvert(type)
      }
    } else {
      onInsert(type)
    }
  }

  return [
    {
      type: 'row',
      items: [
        {
          type: 'button',
          onClick: () => onEditKey(),
          icon: LocalPenIcon,
          text: '编辑-字段',
          title: 'Edit the key (Double-click on the key)',
          disabled: !canEditKey
        },
        {
          type: 'dropdown-button',
          main: {
            type: 'button',
            onClick: () => onEditValue(),
            icon: LocalPenIcon,
            text: '编辑-值',
            title: 'Edit the value (Double-click on the value)',
            disabled: !canEditValue
          },
          width: '11em',
          items: [
            {
              type: 'button',
              icon: LocalPenIcon,
              text: '编辑-值',
              title: 'Edit the value (Double-click on the value)',
              onClick: () => onEditValue(),
              disabled: !canEditValue
            },
            {
              type: 'button',
              icon: enforceString ? LocalCheckSquareIcon : LocalSquareIcon,
              text: '强转字符串',
              title: 'Enforce keeping the value as string when it contains a numeric value',
              onClick: () => onToggleEnforceString(),
              disabled: !canEnforceString
            }
          ]
        }
      ]
    },
    { type: 'separator' },
    {
      type: 'row',
      items: [
        {
          type: 'dropdown-button',
          main: {
            type: 'button',
            onClick: () => onCut(true),
            icon: LocalCutIcon,
            text: '剪切',
            title: 'Cut selected contents, formatted with indentation (Ctrl+X)',
            disabled: !canCut
          },
          width: '10em',
          items: [
            {
              type: 'button',
              icon: LocalCutIcon,
              text: 'Cut formatted',
              title: 'Cut selected contents, formatted with indentation (Ctrl+X)',
              onClick: () => onCut(true),
              disabled: !canCut
            },
            {
              type: 'button',
              icon: LocalCutIcon,
              text: 'Cut compacted',
              title: 'Cut selected contents, without indentation (Ctrl+Shift+X)',
              onClick: () => onCut(false),
              disabled: !canCut
            }
          ]
        },
        {
          type: 'dropdown-button',
          main: {
            type: 'button',
            onClick: () => onCopy(true),
            icon: LocalCopyIcon,
            text: '复制',
            title: 'Copy selected contents, formatted with indentation (Ctrl+C)',
            disabled: !canCopy
          },
          width: '12em',
          items: [
            {
              type: 'button',
              icon: LocalCopyIcon,
              text: 'Copy formatted',
              title: 'Copy selected contents, formatted with indentation (Ctrl+C)',
              onClick: () => onCopy(true),
              disabled: !canCopy
            },
            {
              type: 'button',
              icon: LocalCopyIcon,
              text: 'Copy compacted',
              title: 'Copy selected contents, without indentation (Ctrl+Shift+C)',
              onClick: () => onCopy(false),
              disabled: !canCopy
            }
          ]
        },
        {
          type: 'button',
          onClick: () => onPaste(),
          icon: LocalPasteIcon,
          text: '粘贴',
          title: 'Paste clipboard contents (Ctrl+V)',
          disabled: !canPaste
        }
      ]
    },
    { type: 'separator' },
    {
      type: 'row',
      items: [
        {
          type: 'column',
          items: [
            {
              type: 'button',
              onClick: () => onDuplicate(),
              icon: LocalCloneIcon,
              text: '复制插入',
              title: 'Duplicate selected contents (Ctrl+D)',
              disabled: !canDuplicate
            },
            {
              type: 'button',
              onClick: () => onExtract(),
              icon: LocalCropAltIcon,
              text: '截取覆盖',
              title: 'Extract selected contents',
              disabled: !canExtract
            },
            {
              type: 'button',
              onClick: () => onSort(),
              icon: LocalSortAmountDownAltIcon,
              text: '排序',
              title: 'Sort array or object contents',
              disabled: readOnly || !hasSelectionContents
            },
            {
              type: 'button',
              onClick: () => onRemove(),
              icon: LocalTrashCanIcon,
              text: '删除',
              title: 'Remove selected contents (Delete)',
              disabled: readOnly || !hasSelectionContents
            }
          ]
        },
        {
          type: 'column',
          items: [
            { type: 'label', text: insertOrConvertText },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('structure'),
              icon: convertMode ? LocalArrowRightArrowLeftIcon : LocalPlusIcon,
              text: '自定义',
              title: insertOrConvertText + ' structure like the first item in the array',
              disabled: !canInsertOrConvertStructure
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('object'),
              icon: convertMode ? LocalArrowRightArrowLeftIcon : LocalPlusIcon,
              text: '对象',
              title: insertOrConvertText + ' 对象',
              disabled: !canInsertOrConvertObject
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('array'),
              icon: convertMode ? LocalArrowRightArrowLeftIcon : LocalPlusIcon,
              text: '数组',
              title: insertOrConvertText + ' 数组',
              disabled: !canInsertOrConvertArray
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('value'),
              icon: convertMode ? LocalArrowRightArrowLeftIcon : LocalPlusIcon,
              text: '值',
              title: insertOrConvertText + ' 值',
              disabled: !canInsertOrConvertValue
            }
          ]
        }
      ]
    },
    {
      type: 'separator'
    },
    {
      type: 'row',
      items: [
        {
          type: 'button',
          onClick: () => onInsertBefore(),
          icon: LocalCaretSquareUpIcon,
          text: '之前插入',
          title: 'Select area before current entry to insert or paste contents',
          disabled: readOnly || !hasSelectionContents || rootSelected
        },
        {
          type: 'button',
          onClick: () => onInsertAfter(),
          icon: LocalCaretSquareDownIcon,
          text: '之后插入',
          title: 'Select area after current entry to insert or paste contents',
          disabled: readOnly || !hasSelectionContents || rootSelected
        }
      ]
    }
  ]
}
