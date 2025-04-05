<svelte:options immutable={true} />

<script lang="ts">
  import LocalExclamationTriangleIcon from '$lib/assets/icon/triangle-exclamation-solid.svelte'
  import LocalEyeIcon from '$lib/assets/icon/eye-solid.svelte'
  import LocalWrenchIcon from '$lib/assets/icon/wrench-solid.svelte'
  // ---------------
  import Linter from 'eslint4b-prebuilt'
  // ----------
  import { javascript, esLint } from '@codemirror/lang-javascript'
  import {
    bracketMatching,
    defaultHighlightStyle,
    foldGutter,
    foldKeymap,
    indentOnInput,
    indentUnit,
    syntaxHighlighting
  } from '@codemirror/language'
  import {
    Annotation,
    ChangeSet,
    Compartment,
    EditorSelection,
    EditorState,
    type Extension
  } from '@codemirror/state'
  import {
    crosshairCursor,
    drawSelection,
    dropCursor,
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
    rectangularSelection,
    type ViewUpdate
  } from '@codemirror/view'
  import { indentWithTab, defaultKeymap, historyKeymap } from '@codemirror/commands'
  import { linter, lintGutter, lintKeymap } from '@codemirror/lint'
  import type { Diagnostic } from '@codemirror/lint'
  import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
  import {
    autocompletion,
    closeBrackets,
    closeBracketsKeymap,
    completionKeymap
  } from '@codemirror/autocomplete'
  // --------------
  import { createDebug } from '$lib/utils/debug.js'
  import type { JSONPath } from 'immutable-json-patch'
  import { jsonrepair } from 'jsonrepair'
  import { debounce, isEqual, uniqueId } from 'lodash-es'
  import { flushSync, onDestroy, onMount } from 'svelte'
  import {
    JSON_STATUS_INVALID,
    JSON_STATUS_REPAIRABLE,
    JSON_STATUS_VALID,
    MAX_CHARACTERS_TEXT_PREVIEW,
    MAX_DOCUMENT_SIZE_TEXT_MODE,
    TEXT_MODE_ONCHANGE_DELAY
  } from '$lib/constants.js'
  import {
    activeElementIsChildOf,
    createNormalizationFunctions,
    getWindow
  } from '$lib/utils/domUtils.js'
  import { formatSize } from '$lib/utils/fileUtils.js'
  import { findTextLocation, getText } from '$lib/utils/jsonUtils.js'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import Message from '../../controls/Message.svelte'

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  import { highlighter } from './codemirror/codemirror-theme.js'
  import type {
    Content,
    ContentErrors,
    History,
    HistoryItem,
    JSONParser,
    JSONPatchResult,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnError,
    OnFocus,
    OnJSONEditorModal,
    OnRedo,
    OnRenderMenuInternal,
    OnSelect,
    OnUndo,
    ParseError,
    RichValidationError,
    TextHistoryItem,
    TextSelection,
    ValidationError,
    Validator
  } from '$lib/types.js'
  import { Mode, SelectionType, ValidationSeverity } from '$lib/types.js'
  import {
    isContentParseError,
    isContentValidationErrors,
    isTextHistoryItem
  } from '$lib/typeguards.js'
  import memoizeOne from 'memoize-one'
  import { validateText } from '$lib/logic/validation.js'
  import { truncate } from '$lib/utils/stringUtils.js'
  import { indentationMarkers } from '@replit/codemirror-indentation-markers'
  import { wrappedLineIndent } from 'codemirror-wrapped-line-indent/dist/index.js' // ensure loading ESM, otherwise the vitest test fail

  export let readOnly: boolean
  export let mainMenuBar: boolean
  export let externalContent: Content
  export let history: History<HistoryItem>
  export let indentation: number | string
  export let tabSize: number
  export let escapeUnicodeCharacters: boolean
  export let parser: JSONParser
  export let validator: Validator | undefined
  export let validationParser: JSONParser
  export let onChange: OnChange
  export let onChangeMode: OnChangeMode
  export let onSelect: OnSelect
  export let onUndo: OnUndo
  export let onRedo: OnRedo
  export let onError: OnError
  export let onFocus: OnFocus
  export let onBlur: OnBlur
  export let onJSONEditorModal: OnJSONEditorModal

  const debug = createDebug('jsoneditor:JsMode')

  const isSSR = typeof window === 'undefined'
  debug('isSSR:', isSSR)

  let codeMirrorRef: HTMLDivElement
  let domTextMode: HTMLDivElement
  let codeMirrorView: EditorView
  let editorState: EditorState

  let acceptTooLarge = false

  let validationErrors: ValidationError[] = []
  const linterCompartment = new Compartment()
  const readOnlyCompartment = new Compartment()
  const indentCompartment = new Compartment()
  const tabSizeCompartment = new Compartment()
  const themeCompartment = new Compartment()

  let content: Content = externalContent
  let text = getText(content, indentation, parser) // text is just a cached version of content.text or parsed content.json

  let historyAnnotation = Annotation.define()

  let historyUpdatesQueue: ViewUpdate[] | null = null

  function addHistoryItem(): boolean {
    if (!historyUpdatesQueue || historyUpdatesQueue.length === 0) {
      return false
    }

    // merge changes and create the inverse changes
    const startState = historyUpdatesQueue[0].startState
    const endState = historyUpdatesQueue[historyUpdatesQueue.length - 1].state
    const mergedChanges = historyUpdatesQueue
      .map((update) => update.changes)
      .reduce((mergedChanges, change) => mergedChanges.compose(change))
    const inverseChanges = mergedChanges.invert(startState.doc)

    // create a history item with undo/redo actions
    const item: TextHistoryItem = {
      type: 'text',
      undo: {
        changes: inverseChanges.toJSON(),
        selection: toTextSelection(startState.selection)
      },
      redo: {
        changes: mergedChanges.toJSON(),
        selection: toTextSelection(endState.selection)
      }
    }

    debug('add history item', item)

    history.add(item)

    historyUpdatesQueue = null
    return true
  }

  $: normalization = createNormalizationFunctions({
    escapeControlCharacters: false,
    escapeUnicodeCharacters
  })

  // eslint-disable-next-line svelte/no-unused-svelte-ignore
  // svelte-ignore reactive_declaration_non_reactive_property
  $: setCodeMirrorContent(externalContent, false, false)
  $: updateLinter(validator)
  $: updateIndentation(indentation)
  $: updateTabSize(tabSize)
  $: updateReadOnly(readOnly)

  // force updating the text when escapeUnicodeCharacters changes
  let previousEscapeUnicodeCharacters = escapeUnicodeCharacters
  $: {
    if (previousEscapeUnicodeCharacters !== escapeUnicodeCharacters) {
      previousEscapeUnicodeCharacters = escapeUnicodeCharacters
      forceUpdateText()
    }
  }

  onMount(async () => {
    if (isSSR) {
      return
    }

    try {
      codeMirrorView = createCodeMirrorView({
        target: codeMirrorRef,
        initialText: !disableTextEditor(text, acceptTooLarge)
          ? normalization.escapeValue(text)
          : '',
        readOnly,
        indentation
      })
    } catch (err) {
      // TODO: report error to the user
      console.error(err)
    }
  })

  onDestroy(() => {
    flush()

    if (codeMirrorView) {
      debug('Destroy CodeMirror editor')
      codeMirrorView.destroy()
    }
  })

  export function focus() {
    if (codeMirrorView) {
      debug('focus')
      codeMirrorView.focus()
    }
  }

  // modalOpen is true when one of the modals is open.
  // This is used to track whether the editor still has focus
  let modalOpen = false

  createFocusTracker({
    onMount,
    onDestroy,
    getWindow: () => getWindow(domTextMode),
    hasFocus: () => (modalOpen && document.hasFocus()) || activeElementIsChildOf(domTextMode),
    onFocus,
    onBlur: () => {
      flush()
      onBlur()
    }
  })

  function handleRepair() {
    debug('repair')

    if (readOnly) {
      return
    }

    try {
      const updatedContent = {
        text: jsonrepair(text)
      }

      setCodeMirrorContent(updatedContent, true, false)

      jsonStatus = JSON_STATUS_VALID
      jsonParseError = undefined
    } catch (err) {
      onError(err as Error)
    }
  }

  function handleEditModal() {
    const path = [] as JSONPath
    const codeMirrorText = getCodeMirrorValue()
    openJSONEditorModal(path, codeMirrorText)
  }

  function openJSONEditorModal(path: JSONPath, value: string) {
    debug('openJSONEditorModal', { path, value })

    modalOpen = true

    onJSONEditorModal({
      content: {
        text: value || ''
      },
      path,
      onClose: () => {
        modalOpen = false
        setTimeout(focus)
      },
      onPatch: function (): JSONPatchResult {
        throw new Error('Function not implemented.')
      }
    })
  }

  function handleUndo(): boolean {
    if (readOnly) {
      return false
    }

    // first flush any pending changes
    flush()

    const item = history.undo()
    debug('undo', item)
    if (!isTextHistoryItem(item)) {
      onUndo(item)

      return false
    }

    codeMirrorView.dispatch({
      annotations: historyAnnotation.of('undo'),
      changes: ChangeSet.fromJSON(item.undo.changes),
      selection: EditorSelection.fromJSON(item.undo.selection),
      scrollIntoView: true
    })

    return true
  }

  function handleRedo(): boolean {
    if (readOnly) {
      return false
    }

    // first flush any pending changes
    flush()

    const item = history.redo()
    debug('redo', item)
    if (!isTextHistoryItem(item)) {
      onRedo(item)

      return false
    }

    codeMirrorView.dispatch({
      annotations: historyAnnotation.of('redo'),
      changes: ChangeSet.fromJSON(item.redo.changes),
      selection: EditorSelection.fromJSON(item.redo.selection),
      scrollIntoView: true
    })

    return true
  }

  function handleAcceptTooLarge() {
    acceptTooLarge = true
    setCodeMirrorContent(externalContent, true, true)
  }

  function handleSwitchToTreeMode() {
    onChangeMode(Mode.tree)
  }

  function cancelLoadTooLarge() {
    // copy the latest contents of the text editor again into text
    onChangeCodeMirrorValue()
  }

  function handleSelectValidationError(validationError: ValidationError) {
    debug('select validation error', validationError)

    const { from, to } = toRichValidationError(validationError)
    if (from === undefined || to === undefined) {
      return
    }

    // we take "to" as head, not as anchor, because the scrollIntoView will
    // move to the head, and when a large whole object is selected as a whole,
    // we want to scroll to the start of the object and not the end
    setSelection(from, to)

    focus()
  }

  function handleSelectParseError(parseError: ParseError) {
    debug('select parse error', parseError)

    const richParseError = toRichParseError(parseError, false)
    const from = richParseError.from != null ? richParseError.from : 0
    const to = richParseError.to != null ? richParseError.to : 0

    // we take "to" as head, not as anchor, because the scrollIntoView will
    // move to the head, and when a large whole object is selected as a whole,
    // we want to scroll to the start of the object and not the end
    setSelection(from, to)

    focus()
  }

  function setSelection(anchor: number, head: number) {
    debug('setSelection', { anchor, head })

    if (codeMirrorView) {
      codeMirrorView.dispatch(
        codeMirrorView.state.update({
          selection: { anchor, head },
          scrollIntoView: true
        })
      )
    }
  }

  function createLinter() {
    return linter(linterCallback, { delay: TEXT_MODE_ONCHANGE_DELAY })
  }

  function createCodeMirrorView({
    target,
    initialText,
    readOnly,
    indentation
  }: {
    target: HTMLDivElement
    initialText: string
    readOnly: boolean
    indentation: number | string
  }): EditorView {
    debug('Create CodeMirror editor', { readOnly, indentation })

    const state = EditorState.create({
      doc: initialText,
      extensions: [
        linter(esLint(new Linter())),
        // 显示行号
        lineNumbers(),
        linterCompartment.of(createLinter()),
        // 显示行号和折叠区域
        lintGutter(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        // history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        indentUnit.of('    '),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          // 缩进替换tab为空格
          indentWithTab,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...searchKeymap,
          { key: 'Mod-z', run: handleUndo, preventDefault: true },
          { key: 'Mod-y', mac: 'Mod-Shift-z', run: handleRedo, preventDefault: true },
          { key: 'Ctrl-Shift-z', run: handleRedo, preventDefault: true },
          ...lintKeymap
        ]),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        highlighter,
        indentationMarkers({ hideFirstIndent: true }),
        EditorView.updateListener.of((update) => {
          editorState = update.state

          if (update.docChanged) {
            const isCustomHistoryEvent = update.transactions.some(
              (transaction) => !!transaction.annotation(historyAnnotation)
            )

            if (!isCustomHistoryEvent) {
              historyUpdatesQueue = [...(historyUpdatesQueue ?? []), update]
            }

            onChangeCodeMirrorValueDebounced()
          }

          if (update.selectionSet) {
            // note that emitOnSelect is invoked in onChangeCodeMirrorValue too,
            // right after firing onChange. Hence, the else if here, we do not want to fire it twice.
            emitOnSelect()
          }
        }),
        javascript(),
        // 自动换行
        EditorView.lineWrapping,
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        // 设置Tab键的缩进大小
        tabSizeCompartment.of(EditorState.tabSize.of(tabSize)),
        indentCompartment.of(createIndent(indentation)),
        themeCompartment.of(EditorView.theme({}, { dark: hasDarkTheme() }))
      ]
    })

    codeMirrorView = new EditorView({
      state,
      parent: target
    })

    return codeMirrorView
  }

  function getCodeMirrorValue() {
    return codeMirrorView ? normalization.unescapeValue(codeMirrorView.state.doc.toString()) : ''
  }

  function hasDarkTheme() {
    return codeMirrorRef
      ? getComputedStyle(codeMirrorRef).getPropertyValue('--jse-theme').includes('dark')
      : false
  }

  function toRichValidationError(validationError: ValidationError): RichValidationError {
    const { path, message, severity } = validationError
    const { line, column, from, to } = findTextLocation(normalization.escapeValue(text), path)

    return {
      path,
      line,
      column,
      from,
      to,
      message,
      severity,
      actions: []
    }
  }

  function toRichParseError(parseError: ParseError, isRepairable: boolean): RichValidationError {
    const { line, column, position, message } = parseError

    return {
      path: [] as JSONPath,
      line,
      column,
      from: position,
      to: position,
      severity: ValidationSeverity.error,
      message,
      actions:
        isRepairable && !readOnly
          ? [
              {
                name: 'Auto repair',
                apply: () => handleRepair()
              }
            ]
          : undefined
    }
  }

  function toDiagnostic(error: RichValidationError): Diagnostic {
    return {
      from: error.from || 0,
      to: error.to || 0,
      message: error.message || '',
      actions: error.actions as Diagnostic['actions'],
      severity: error.severity
    }
  }

  function setCodeMirrorContent(newContent: Content, emitChange: boolean, forceUpdate: boolean) {
    const newText = getText(newContent, indentation, parser)
    const isChanged = !isEqual(newContent, content)
    const previousContent = content

    debug('setCodeMirrorContent', { isChanged, emitChange, forceUpdate })

    if (!codeMirrorView || (!isChanged && !forceUpdate)) {
      return
    }

    content = newContent
    text = newText

    if (!disableTextEditor(text, acceptTooLarge)) {
      // keep state
      // to reset state: codeMirrorView.setState(EditorState.create({doc: text, extensions: ...}))
      codeMirrorView.dispatch({
        changes: {
          from: 0,
          to: codeMirrorView.state.doc.length,
          insert: normalization.escapeValue(text)
        }
      })
    }

    addHistoryItem()

    if (isChanged && emitChange) {
      emitOnChange(content, previousContent)
    }
  }

  /**
   * Force refreshing the editor, for example after changing the font size
   * to update the positioning of the line numbers in the gutter
   */
  export async function refresh(): Promise<void> {
    debug('refresh')

    // update the theme (light/dark), but also, as a side effect,
    // refresh the font size of the line numbers in the gutter
    await updateTheme()
  }

  function forceUpdateText() {
    debug('forceUpdateText', { escapeUnicodeCharacters })

    if (codeMirrorView) {
      codeMirrorView.dispatch({
        changes: {
          from: 0,
          to: codeMirrorView.state.doc.length,
          insert: normalization.escapeValue(text)
        }
      })
    }
  }

  function onChangeCodeMirrorValue() {
    if (!codeMirrorView) {
      return
    }

    const codeMirrorText = getCodeMirrorValue()

    const isChanged = codeMirrorText !== text
    debug('onChangeCodeMirrorValue', { isChanged })
    if (!isChanged) {
      return
    }

    const previousContent = content
    text = codeMirrorText
    content = { text }

    addHistoryItem()

    emitOnChange(content, previousContent)

    // We emit OnSelect on the next tick to cater for the case where
    // the user changes the content directly inside the OnChange callback.
    // This change will be dispatched by Svelte on the next tick. Before
    // that tick, emitOnSelect would be fired based on the "old" contents,
    // which may be out of range when the replacement by the user is shorter.
    flushSync()
    emitOnSelect()
  }

  function updateLinter(validator: Validator | undefined) {
    debug('updateLinter', validator)

    if (!codeMirrorView) {
      return
    }

    codeMirrorView.dispatch({
      effects: linterCompartment.reconfigure(createLinter())
    })
  }

  function updateIndentation(indentation: number | string) {
    if (codeMirrorView) {
      debug('updateIndentation', indentation)

      codeMirrorView.dispatch({
        effects: indentCompartment.reconfigure(createIndent(indentation))
      })
    }
  }

  function updateTabSize(tabSize: number) {
    if (codeMirrorView) {
      debug('updateTabSize', tabSize)

      codeMirrorView.dispatch({
        effects: tabSizeCompartment.reconfigure(EditorState.tabSize.of(tabSize))
      })
    }
  }

  function updateReadOnly(readOnly: boolean) {
    if (codeMirrorView) {
      debug('updateReadOnly', readOnly)

      codeMirrorView.dispatch({
        effects: [readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly))]
      })
    }
  }

  async function updateTheme(): Promise<void> {
    // we check the theme on the next tick, to make sure the page
    // is re-rendered with (possibly) changed CSS variables
    flushSync()

    if (codeMirrorView) {
      const dark = hasDarkTheme()
      debug('updateTheme', { dark })

      codeMirrorView.dispatch({
        effects: [themeCompartment.reconfigure(EditorView.theme({}, { dark }))]
      })

      // resolve on next tick, when code mirror rendering is updated
      return new Promise((resolve) => setTimeout(resolve))
    }

    return Promise.resolve()
  }

  function createIndent(indentation: number | string): Extension[] {
    const indent = indentUnit.of(
      typeof indentation === 'number' ? ' '.repeat(indentation) : indentation
    )

    // We disable wrappedLineIndent in case of tabs to work around a bug:
    // https://github.com/fauzi9331/codemirror-wrapped-line-indent/issues/2
    return indentation === '\t' ? [indent] : [indent, wrappedLineIndent]
  }

  // debounce the input: when pressing Enter at the end of a line, two change
  // events are fired: one with the new Return character, and a second with
  // indentation added on the new line. This causes a race condition when used
  // for example in React. Debouncing the onChange events also results in not
  // firing a change event with every character that a user types, but only as
  // soon as the user stops typing.
  const onChangeCodeMirrorValueDebounced = debounce(
    onChangeCodeMirrorValue,
    TEXT_MODE_ONCHANGE_DELAY
  )

  export function flush() {
    onChangeCodeMirrorValueDebounced.flush()
  }

  function emitOnChange(content: Content, previousContent: Content) {
    if (onChange) {
      onChange(content, previousContent, {
        contentErrors: validate(),
        patchResult: undefined
      })
    }
  }

  function emitOnSelect() {
    onSelect(toTextSelection(editorState.selection))
  }

  function toTextSelection(selection: EditorSelection): TextSelection {
    return {
      type: SelectionType.text,
      ...selection.toJSON()
    }
  }

  function disableTextEditor(text: string, acceptTooLarge: boolean): boolean {
    const tooLarge = text ? text.length > MAX_DOCUMENT_SIZE_TEXT_MODE : false
    return tooLarge && !acceptTooLarge
  }

  let jsonStatus = JSON_STATUS_VALID

  let jsonParseError: ParseError | undefined

  function linterCallback(): Diagnostic[] {
    if (disableTextEditor(text, acceptTooLarge)) {
      return []
    }

    const contentErrors = validate()

    if (isContentParseError(contentErrors)) {
      const { parseError, isRepairable } = contentErrors

      return [toDiagnostic(toRichParseError(parseError, isRepairable))]
    }

    if (isContentValidationErrors(contentErrors)) {
      return contentErrors.validationErrors.map(toRichValidationError).map(toDiagnostic)
    }

    return []
  }

  export function validate(): ContentErrors | undefined {
    debug('validate:start')
    console.log('validate:start')

    flush()

    const contentErrors = memoizedValidateText(
      normalization.escapeValue(text),
      validator,
      parser,
      validationParser
    )

    if (isContentParseError(contentErrors)) {
      jsonStatus = contentErrors.isRepairable ? JSON_STATUS_REPAIRABLE : JSON_STATUS_INVALID
      jsonParseError = contentErrors.parseError
      validationErrors = []
    } else {
      jsonStatus = JSON_STATUS_VALID
      jsonParseError = undefined
      validationErrors = contentErrors?.validationErrors || []
    }

    debug('validate:end')

    return contentErrors
  }

  // because onChange returns the validation errors and there is also a separate listener,
  // we would execute validation twice. Memoizing the last result solves this.
  const memoizedValidateText = memoizeOne(validateText)

  function handleShowMe() {
    if (jsonParseError) {
      handleSelectParseError(jsonParseError)
    }
  }

  const repairActionShowMe = {
    icon: LocalEyeIcon,
    text: 'Show me',
    title: 'Move to the parse error location',
    onClick: handleShowMe
  }

  $: repairActions =
    jsonStatus === JSON_STATUS_REPAIRABLE && !readOnly
      ? [
          {
            icon: LocalWrenchIcon,
            text: 'Auto repair',
            title: 'Automatically repair JSON',
            onClick: handleRepair
          },
          repairActionShowMe
        ]
      : [repairActionShowMe]
</script>

<div class="jse-text-mode" class:no-main-menu={!mainMenuBar} bind:this={domTextMode}>
  {#if !isSSR}
    {@const editorDisabled = disableTextEditor(text, acceptTooLarge)}

    <div class="jse-contents" class:jse-hidden={editorDisabled} bind:this={codeMirrorRef}></div>

    {#if editorDisabled}
      <Message
        icon={LocalExclamationTriangleIcon}
        type="error"
        message={`The JSON document is larger than ${formatSize(MAX_DOCUMENT_SIZE_TEXT_MODE)}, ` +
          `and may crash your browser when loading it in text mode. Actual size: ${formatSize(text.length)}.`}
        actions={[
          {
            text: 'Open anyway',
            title: 'Open the document in text mode. This may freeze or crash your browser.',
            onClick: handleAcceptTooLarge
          },
          {
            text: 'Open in tree mode',
            title: 'Open the document in tree mode. Tree mode can handle large documents.',
            onClick: handleSwitchToTreeMode
          },
          {
            text: 'Cancel',
            title: 'Cancel opening this large document.',
            onClick: cancelLoadTooLarge
          }
        ]}
        onClose={focus}
      />

      <div class="jse-contents jse-preview">
        {truncate(text || '', MAX_CHARACTERS_TEXT_PREVIEW)}
      </div>
    {/if}
  {:else}
    <div class="jse-contents">
      <div class="jse-loading-space"></div>
      <div class="jse-loading">loading...</div>
    </div>
  {/if}
</div>

<style src="./JsMode.scss"></style>
