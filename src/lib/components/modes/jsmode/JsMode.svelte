<svelte:options immutable={true} />

<script lang="ts">
  // ---------------
  import globals from 'globals'
  // Uses linter.mjs
  import * as eslint from 'eslint-linter-browserify'
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
  import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
  import {
    autocompletion,
    closeBrackets,
    closeBracketsKeymap,
    completionKeymap
  } from '@codemirror/autocomplete'
  // --------------
  import { createDebug } from '$lib/utils/debug.js'
  import { debounce, isEqual } from 'lodash-es'
  import { flushSync, onDestroy, onMount } from 'svelte'
  import { MAX_DOCUMENT_SIZE_TEXT_MODE, TEXT_MODE_ONCHANGE_DELAY } from '$lib/constants.js'
  import {
    activeElementIsChildOf,
    createNormalizationFunctions,
    getWindow
  } from '$lib/utils/domUtils.js'
  import { findTextLocation, getText } from '$lib/utils/jsonUtils.js'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  import { highlighter } from './codemirror/codemirror-theme.js'
  import type {
    Content,
    History,
    HistoryItem,
    JSONParser,
    OnBlur,
    OnChange,
    OnFocus,
    OnRedo,
    OnSelect,
    OnUndo,
    RichValidationError,
    TextHistoryItem,
    TextSelection,
    ValidationError
  } from '$lib/types.js'
  import { SelectionType } from '$lib/types.js'
  import { isTextHistoryItem } from '$lib/typeguards.js'
  import { indentationMarkers } from '@replit/codemirror-indentation-markers'
  import { wrappedLineIndent } from 'codemirror-wrapped-line-indent/dist/index.js' // ensure loading ESM, otherwise the vitest test fail

  export let readOnly: boolean
  export let externalContent: Content
  export let history: History<HistoryItem>
  export let indentation: number | string
  export let tabSize: number
  export let escapeUnicodeCharacters: boolean
  export let parser: JSONParser
  export let onChange: OnChange
  export let onSelect: OnSelect
  export let onUndo: OnUndo
  export let onRedo: OnRedo
  export let onFocus: OnFocus
  export let onBlur: OnBlur

  const debug = createDebug('jsoneditor:JsMode')

  const isSSR = typeof window === 'undefined'
  debug('isSSR:', isSSR)

  let codeMirrorRef: HTMLDivElement
  let domTextMode: HTMLDivElement
  let codeMirrorView: EditorView
  let editorState: EditorState

  let acceptTooLarge = false

  const readOnlyCompartment = new Compartment()
  const indentCompartment = new Compartment()
  const tabSizeCompartment = new Compartment()
  const themeCompartment = new Compartment()

  let content: Content = externalContent
  let text = getText(content, indentation, parser) // text is just a cached version of content.text or parsed content.json

  let historyAnnotation = Annotation.define()

  let historyUpdatesQueue: ViewUpdate[] | null = null

  const eslintConfig = {
    // eslint configuration
    languageOptions: {
      globals: {
        ...globals.node
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    rules: {
      semi: ['error', 'never']
    }
  }

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
        linter(esLint(new eslint.Linter(), eslintConfig)),
        // 显示行号
        lineNumbers(),
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
        contentErrors: undefined,
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
</script>

<div class="jse-text-mode" bind:this={domTextMode}>
  {#if !isSSR}
    {@const editorDisabled = disableTextEditor(text, acceptTooLarge)}

    <div class="jse-contents" class:jse-hidden={editorDisabled} bind:this={codeMirrorRef}></div>
  {:else}
    <div class="jse-contents">
      <div class="jse-loading-space"></div>
      <div class="jse-loading">loading...</div>
    </div>
  {/if}
</div>

<style src="./JsMode.scss"></style>
