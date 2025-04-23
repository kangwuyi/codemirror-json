import {
  IconSquareCheck,
  IconTrash,
  IconSquare,
  IconPlus,
  IconCopy,
  IconCopyCheck,
  IconPencil,
  IconClipboard,
  IconCut
} from '@tabler/icons-svelte'
import type { ContextMenuItem, DocumentState, JSONSelection } from 'codemirror-json'

import { isKeySelection, isMultiSelection, isValueSelection } from '$lib/logic/selection'
import { getIn } from 'immutable-json-patch'
import { getFocusPath, singleItemSelected } from '$lib/logic/selection'
import { isObjectOrArray } from '$lib/utils/typeUtils'
import { getEnforceString } from '$lib/logic/documentState'

export default function ({
  json,
  documentState,
  selection,
  readOnly,
  onEditValue,
  onEditRow,
  onToggleEnforceString,
  onCut,
  onCopy,
  onPaste,
  onRemove,
  onDuplicateRow,
  onInsertBeforeRow,
  onInsertAfterRow,
  onRemoveRow
}: {
  json: unknown | undefined
  documentState: DocumentState | undefined
  selection: JSONSelection | undefined
  readOnly: boolean
  onEditValue: () => void
  onEditRow: () => void
  onToggleEnforceString: () => void
  onCut: (indent: boolean) => void
  onCopy: (indent: boolean) => void
  onPaste: () => void
  onRemove: () => void
  onDuplicateRow: () => void
  onInsertBeforeRow: () => void
  onInsertAfterRow: () => void
  onRemoveRow: () => void
}): ContextMenuItem[] {
  const hasJson = json !== undefined
  const hasSelection = !!selection
  const focusValue =
    json !== undefined && selection ? getIn(json, getFocusPath(selection)) : undefined

  const hasSelectionContents =
    hasJson &&
    (isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection))

  const canEditValue =
    !readOnly && hasJson && selection !== undefined && singleItemSelected(selection)
  const canEnforceString = canEditValue && !isObjectOrArray(focusValue)

  const canCut = !readOnly && hasSelectionContents

  const enforceString =
    selection !== undefined ? getEnforceString(json, documentState, getFocusPath(selection)) : false

  return [
    { type: 'separator' },
    {
      type: 'row',
      items: [
        {
          type: 'column',
          items: [
            { type: 'label', text: '单元格:' },
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
                  icon: enforceString ? IconSquareCheck : IconSquare,
                  text: '强转字符串',
                  title: 'Enforce keeping the value as string when it contains a numeric value',
                  onClick: () => onToggleEnforceString(),
                  disabled: !canEnforceString
                }
              ]
            },
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
                  disabled: readOnly || !hasSelectionContents
                },
                {
                  type: 'button',
                  icon: IconCut,
                  text: 'Cut compacted',
                  title: 'Cut selected contents, without indentation (Ctrl+Shift+X)',
                  onClick: () => onCut(false),
                  disabled: readOnly || !hasSelectionContents
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
                disabled: !hasSelectionContents
              },
              width: '12em',
              items: [
                {
                  type: 'button',
                  icon: IconCopy,
                  text: 'Copy formatted',
                  title: 'Copy selected contents, formatted with indentation (Ctrl+C)',
                  onClick: () => onCopy(false),
                  disabled: !hasSelectionContents
                },
                {
                  type: 'button',
                  icon: IconCopy,
                  text: 'Copy compacted',
                  title: 'Copy selected contents, without indentation (Ctrl+Shift+C)',
                  onClick: () => onCopy(false),
                  disabled: !hasSelectionContents
                }
              ]
            },
            {
              type: 'button',
              onClick: () => onPaste(),
              icon: IconClipboard,
              text: '粘贴',
              title: 'Paste clipboard contents (Ctrl+V)',
              disabled: readOnly || !hasSelection
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
            { type: 'label', text: '行:' },
            {
              type: 'button',
              onClick: () => onEditRow(),
              icon: IconPencil,
              text: '编辑-行',
              title: 'Edit the current row',
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onDuplicateRow(),
              icon: IconCopyCheck,
              text: '复制行',
              title: 'Duplicate the current row (Ctrl+D)',
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onInsertBeforeRow(),
              icon: IconPlus,
              text: '之前插入',
              title: 'Insert a row before the current row',
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onInsertAfterRow(),
              icon: IconPlus,
              text: '之后插入',
              title: 'Insert a row after the current row',
              disabled: readOnly || !hasSelection || !hasJson
            },
            {
              type: 'button',
              onClick: () => onRemoveRow(),
              icon: IconTrash,
              text: '删除行',
              title: 'Remove current row',
              disabled: readOnly || !hasSelection || !hasJson
            }
          ]
        }
      ]
    }
  ]
}
