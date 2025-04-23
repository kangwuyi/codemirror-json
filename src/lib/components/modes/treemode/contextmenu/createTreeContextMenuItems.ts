import {
  IconTrash,
  IconSquare,
  IconSquareFilled,
  IconCaretUpFilled,
  IconCaretDownFilled,
  IconPlus,
  IconCopy,
  IconCopyCheck,
  IconPencil,
  IconClipboard,
  IconCut,
  IconCrop,
  IconTransfer,
  IconSortDescending
} from '@tabler/icons-svelte'
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
          icon: IconPencil,
          text: '编辑-字段',
          title: 'Edit the key (Double-click on the key)',
          disabled: !canEditKey
        },
        {
          type: 'dropdown-button',
          main: {
            type: 'button',
            onClick: () => onEditValue(),
            icon: IconPencil,
            text: '编辑-值',
            title: 'Edit the value (Double-click on the value)',
            disabled: !canEditValue
          },
          width: '11em',
          items: [
            {
              type: 'button',
              icon: IconPencil,
              text: '编辑-值',
              title: 'Edit the value (Double-click on the value)',
              onClick: () => onEditValue(),
              disabled: !canEditValue
            },
            {
              type: 'button',
              icon: enforceString ? IconSquareFilled : IconSquare,
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
            icon: IconCut,
            text: '剪切',
            title: 'Cut selected contents, formatted with indentation (Ctrl+X)',
            disabled: !canCut
          },
          width: '10em',
          items: [
            {
              type: 'button',
              icon: IconCut,
              text: 'Cut formatted',
              title: 'Cut selected contents, formatted with indentation (Ctrl+X)',
              onClick: () => onCut(true),
              disabled: !canCut
            },
            {
              type: 'button',
              icon: IconCut,
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
            icon: IconCopy,
            text: '复制',
            title: 'Copy selected contents, formatted with indentation (Ctrl+C)',
            disabled: !canCopy
          },
          width: '12em',
          items: [
            {
              type: 'button',
              icon: IconCopy,
              text: 'Copy formatted',
              title: 'Copy selected contents, formatted with indentation (Ctrl+C)',
              onClick: () => onCopy(true),
              disabled: !canCopy
            },
            {
              type: 'button',
              icon: IconCopy,
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
          icon: IconClipboard,
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
              icon: IconCopyCheck,
              text: '复制插入',
              title: 'Duplicate selected contents (Ctrl+D)',
              disabled: !canDuplicate
            },
            {
              type: 'button',
              onClick: () => onExtract(),
              icon: IconCrop,
              text: '截取覆盖',
              title: 'Extract selected contents',
              disabled: !canExtract
            },
            {
              type: 'button',
              onClick: () => onSort(),
              icon: IconSortDescending,
              text: '排序',
              title: 'Sort array or object contents',
              disabled: readOnly || !hasSelectionContents
            },
            {
              type: 'button',
              onClick: () => onRemove(),
              icon: IconTrash,
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
              icon: convertMode ? IconTransfer : IconPlus,
              text: '自定义',
              title: insertOrConvertText + ' structure like the first item in the array',
              disabled: !canInsertOrConvertStructure
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('object'),
              icon: convertMode ? IconTransfer : IconPlus,
              text: '对象',
              title: insertOrConvertText + ' 对象',
              disabled: !canInsertOrConvertObject
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('array'),
              icon: convertMode ? IconTransfer : IconPlus,
              text: '数组',
              title: insertOrConvertText + ' 数组',
              disabled: !canInsertOrConvertArray
            },
            {
              type: 'button',
              onClick: () => handleInsertOrConvert('value'),
              icon: convertMode ? IconTransfer : IconPlus,
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
          icon: IconCaretUpFilled,
          text: '之前插入',
          title: 'Select area before current entry to insert or paste contents',
          disabled: readOnly || !hasSelectionContents || rootSelected
        },
        {
          type: 'button',
          onClick: () => onInsertAfter(),
          icon: IconCaretDownFilled,
          text: '之后插入',
          title: 'Select area after current entry to insert or paste contents',
          disabled: readOnly || !hasSelectionContents || rootSelected
        }
      ]
    }
  ]
}
