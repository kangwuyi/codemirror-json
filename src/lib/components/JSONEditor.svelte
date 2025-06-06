<svelte:options accessors={false} immutable={true} />

<script lang="ts">
  import emitter from '../event/bus.js'
  import { createDebug } from '../utils/debug.js'
  import { uniqueId } from '../utils/uniqueId.js'
  import { isEqualParser, isJSONContent, validateContentType } from '../utils/jsonUtils.js'
  import AbsolutePopup from './modals/popup/AbsolutePopup.svelte'
  import { renderValue } from '$lib/plugins/value/renderValue.js'
  import { flushSync } from 'svelte'
  import type {
    Content,
    ContentErrors,
    ContextMenuItem,
    JSONEditorModalCallback,
    JSONEditorModalProps,
    JSONEditorPropsOptional,
    JSONEditorSelection,
    JSONParser,
    JSONPatchResult,
    JSONPathParser,
    MenuItem,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnChangeStatus,
    OnClassName,
    OnError,
    OnExpand,
    OnFocus,
    OnRenderValue,
    OnSelect,
    SortModalCallback,
    Validator
  } from '$lib/types'
  import type { OnRenderContextMenu } from '$lib/types.js'
  import { Mode } from '$lib/types.js'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { noop } from '../utils/noop.js'
  import { parseJSONPath, stringifyJSONPath } from '$lib/utils/pathUtils.js'
  import JSONEditorRoot from './modes/JSONEditorRoot.svelte'
  import JSONEditorModal from './modals/JSONEditorModal.svelte'
  import memoizeOne from 'memoize-one'
  import * as lodash from 'lodash-es'
  import SortModal from './modals/SortModal.svelte'

  // TODO: document how to enable debugging in the readme: localStorage.debug="jsoneditor:*", then reload
  const debug = createDebug('jsoneditor:JSONEditor')

  const contentDefault = { text: '' }
  const selectionDefault = undefined
  const readOnlyDefault = false
  const indentationDefault = 2
  const tabSizeDefault = 4
  const truncateTextSizeDefault = 1000
  const modeDefault = Mode.tree
  const statusBarDefault = true
  const askToFormatDefault = true
  const escapeControlCharactersDefault = false
  const escapeUnicodeCharactersDefault = false
  const flattenColumnsDefault = true
  const parserDefault = JSON
  const validatorDefault = undefined
  const validationParserDefault = JSON
  const pathParserDefault = {
    parse: parseJSONPath,
    stringify: stringifyJSONPath
  }
  const onChangeDefault = undefined
  const onSelectDefault = undefined
  const onRenderValueDefault = renderValue
  const onClassNameDefault = noop
  const onRenderContextMenuDefault = noop
  const onChangeModeDefault = noop
  const onErrorDefault: OnError = (err) => {
    console.error(err)
    alert(err.toString()) // TODO: create a nice alert modal
  }
  const onFocusDefault = noop
  const onBlurDefault = noop

  export let content: Content = contentDefault
  export let selection: JSONEditorSelection | undefined = selectionDefault
  export let readOnly: boolean = readOnlyDefault
  export let indentation: number | string = indentationDefault
  export let tabSize: number = tabSizeDefault
  export let truncateTextSize: number = truncateTextSizeDefault
  export let mode: Mode = modeDefault
  export let statusBar: boolean = statusBarDefault
  export let askToFormat: boolean = askToFormatDefault
  export let escapeControlCharacters: boolean = escapeControlCharactersDefault
  export let escapeUnicodeCharacters: boolean = escapeUnicodeCharactersDefault
  export let flattenColumns: boolean = flattenColumnsDefault
  export let parser: JSONParser = parserDefault
  export let validator: Validator | undefined = validatorDefault
  export let validationParser: JSONParser = validationParserDefault
  export let pathParser: JSONPathParser = pathParserDefault
  export let onChange: OnChange | undefined = onChangeDefault
  export let onSelect: OnSelect | undefined = onSelectDefault
  export let onRenderValue: OnRenderValue = onRenderValueDefault
  export let onClassName: OnClassName = onClassNameDefault
  export let onRenderContextMenu: OnRenderContextMenu = onRenderContextMenuDefault
  export let onChangeMode: OnChangeMode = onChangeModeDefault
  export let onError: OnError = onErrorDefault
  export let onFocus: OnFocus = onFocusDefault
  export let onBlur: OnBlur = onBlurDefault
  export let onSetMitt: any | undefined = onChangeDefault

  let instanceId = uniqueId()
  let hasFocus = false
  let refJSONEditorRoot: JSONEditorRoot
  let jsonEditorModalProps: JSONEditorModalProps | undefined = undefined
  let sortModalProps: SortModalCallback | undefined

  $: {
    const contentError = validateContentType(content)
    if (contentError) {
      console.error('Error: ' + contentError)
    }
  }

  // backward compatibility warning since v1.0.0
  $: if (selection === null) {
    console.warn('selection is invalid: it is null but should be undefined')
  }

  // We memoize the last parse result for the case when the content is text and very large.
  // In that case parsing takes a few seconds. When the user switches between tree and table mode,
  // without having made a change, we do not want to parse the text again.
  $: parseMemoizeOne = memoizeOne(parser.parse)

  // rerender the full editor when the parser changes. This is needed because
  // numeric state is hold at many places in the editor.
  let previousParser = parser
  $: {
    if (!isEqualParser(parser, previousParser)) {
      debug('parser changed, recreate editor')

      if (isJSONContent(content)) {
        const text = previousParser.stringify(content.json)
        content = {
          json: text !== undefined ? parser.parse(text) : undefined
        }
      }

      previousParser = parser

      // new editor id -> will re-create the editor
      instanceId = uniqueId()
    }
  }

  export function get(): Content {
    return content
  }

  export function set(newContent: Content): void {
    debug('set')

    const contentError = validateContentType(newContent)
    if (contentError) {
      throw new Error(contentError)
    }

    // new editor id -> will re-create the editor
    instanceId = uniqueId()

    // update content *after* re-render, so that the new editor will trigger an onChange event
    content = newContent

    flushSync()
  }

  export function update(updatedContent: Content): void {
    debug('update')

    const contentError = validateContentType(updatedContent)
    if (contentError) {
      throw new Error(contentError)
    }

    content = updatedContent

    flushSync()
  }

  export function patch(operations: JSONPatchDocument): JSONPatchResult {
    // Note that patch has an optional afterPatch callback.
    // right now we don's support this in the public API.
    const result = refJSONEditorRoot.patch(operations)

    flushSync()

    return result
  }

  export function select(newSelection: JSONEditorSelection | undefined): void {
    selection = newSelection

    flushSync()
  }

  export function expand(path: JSONPath, callback?: OnExpand): void {
    refJSONEditorRoot.expand(path, callback)

    flushSync()
  }

  export function collapse(path: JSONPath, recursive = false): void {
    refJSONEditorRoot.collapse(path, recursive)

    flushSync()
  }

  /**
   * Validate the contents of the editor using the configured validator.
   * Returns a parse error or a list with validation warnings
   */
  export function validate(): ContentErrors | undefined {
    return refJSONEditorRoot.validate()
  }

  /**
   * In tree mode, invalid JSON is automatically repaired when loaded. When the
   * repair was successful, the repaired contents are rendered but not yet
   * applied to the document itself until the user clicks "Ok" or starts editing
   * the data. Instead of accepting the repair, the user can also click
   * "Repair manually instead". Invoking `.acceptAutoRepair()` will
   * programmatically accept the repair. This will trigger an update,
   * and the method itself also returns the updated contents. In case of text
   * mode or when the editor is not in an "accept auto repair" status, nothing
   * will happen, and the contents will be returned as is.
   */
  export function acceptAutoRepair(): Content {
    const content = refJSONEditorRoot.acceptAutoRepair()

    flushSync()

    return content
  }

  export async function scrollTo(path: JSONPath): Promise<void> {
    await refJSONEditorRoot.scrollTo(path)
  }

  export function findElement(path: JSONPath): Element | undefined {
    return refJSONEditorRoot.findElement(path)
  }

  export function focus(): void {
    if (lodash.has(refJSONEditorRoot, 'focus')) refJSONEditorRoot.focus()
    flushSync()
  }

  export async function refresh(): Promise<void> {
    await refJSONEditorRoot.refresh()
  }

  export function updateProps(props: JSONEditorPropsOptional): void {
    const names = Object.keys(props) as (keyof JSONEditorPropsOptional)[]

    for (const name of names) {
      switch (name) {
        case 'content':
          content = props[name] ?? contentDefault
          break
        case 'selection':
          selection = props[name] ?? selectionDefault
          break
        case 'readOnly':
          readOnly = props[name] ?? readOnlyDefault
          break
        case 'indentation':
          indentation = props[name] ?? indentationDefault
          break
        case 'tabSize':
          tabSize = props[name] ?? tabSizeDefault
          break
        case 'truncateTextSize':
          truncateTextSize = props[name] ?? truncateTextSizeDefault
          break
        case 'mode':
          mode = props[name] ?? modeDefault
          break
        case 'statusBar':
          statusBar = props[name] ?? statusBarDefault
          break
        case 'askToFormat':
          askToFormat = props[name] ?? askToFormatDefault
          break
        case 'escapeControlCharacters':
          escapeControlCharacters = props[name] ?? escapeControlCharactersDefault
          break
        case 'escapeUnicodeCharacters':
          escapeUnicodeCharacters = props[name] ?? escapeUnicodeCharactersDefault
          break
        case 'flattenColumns':
          flattenColumns = props[name] ?? flattenColumnsDefault
          break
        case 'parser':
          parser = props[name] ?? parserDefault
          break
        case 'validator':
          validator = props[name] ?? validatorDefault
          break
        case 'validationParser':
          validationParser = props[name] ?? validationParserDefault
          break
        case 'pathParser':
          pathParser = props[name] ?? pathParserDefault
          break
        case 'onChange':
          onChange = props[name] ?? onChangeDefault
          break
        case 'onRenderValue':
          onRenderValue = props[name] ?? onRenderValueDefault
          break
        case 'onClassName':
          onClassName = props[name] ?? onClassNameDefault
          break
        case 'onRenderContextMenu':
          onRenderContextMenu = props[name] ?? onRenderContextMenuDefault
          break
        case 'onChangeMode':
          onChangeMode = props[name] ?? onChangeModeDefault
          break
        case 'onSelect':
          onSelect = props[name] ?? onSelectDefault
          break
        case 'onError':
          onError = props[name] ?? onErrorDefault
          break
        case 'onFocus':
          onFocus = props[name] ?? onFocusDefault
          break
        case 'onBlur':
          onBlur = props[name] ?? onBlurDefault
          break

        default:
          // We should never reach this default case
          unknownProperty(name)
      }
    }

    function unknownProperty(name: never) {
      debug(`Unknown property "${name}"`)
    }

    flushSync()
  }

  export async function destroy() {
    throw new Error(
      'class method destroy() is deprecated. ' +
        'It is replaced with a method destroy() in the vanilla library.'
    )
  }

  function handleChange(updatedContent: Content, previousContent: Content, status: OnChangeStatus) {
    content = updatedContent

    if (onChange) {
      onChange(updatedContent, previousContent, status)
    }
  }

  function handleSetMitt() {
    onSetMitt(emitter)
  }
  handleSetMitt()

  function handleSelect(updatedSelection: JSONEditorSelection | undefined) {
    selection = updatedSelection

    if (onSelect) {
      onSelect(lodash.cloneDeep(updatedSelection))
    }
  }

  function handleFocus() {
    hasFocus = true
    if (onFocus) {
      onFocus()
    }
  }

  function handleBlur() {
    hasFocus = false
    if (onBlur) {
      onBlur()
    }
  }

  async function toggleMode(newMode: Mode) {
    if (mode === newMode) {
      return
    }

    mode = newMode

    flushSync()
    focus()

    onChangeMode(newMode)
  }

  // The onSortModal is positioned here for consistency with TransformModal
  function onSortModal(props: SortModalCallback) {
    if (readOnly) {
      return
    }

    sortModalProps = props
  }

  // 弹出层
  // The onJSONEditorModal method is located in JSONEditor to prevent circular references:
  //     JSONEditor -> TableMode -> JSONEditorModal -> JSONEditor
  function onJSONEditorModal({
    cacheMode,
    content,
    path,
    onPatch,
    onClose
  }: JSONEditorModalCallback) {
    debug('onJSONEditorModal', { content, path })

    jsonEditorModalProps = {
      cacheMode,
      content,
      path,
      onPatch,
      readOnly,
      indentation,
      tabSize,
      truncateTextSize,
      statusBar,
      askToFormat,
      escapeControlCharacters,
      escapeUnicodeCharacters,
      flattenColumns,
      parser,
      validator: undefined, // TODO: support partial JSON validation?
      validationParser,
      pathParser,
      onRenderValue,
      onClassName,
      onRenderContextMenu,
      onSortModal,
      onClose
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    // prevent browser addons from reacting to keyboard inputs inside the editor
    // see https://github.com/josdejong/svelte-jsoneditor/issues/512
    event.stopPropagation()
  }

  // --------------
  $: debug('mode changed to', mode)
</script>

<AbsolutePopup>
  <div class="jse-main" class:jse-focus={hasFocus} on:keydown={handleKeyDown} role="none">
    {#key instanceId}
      <JSONEditorRoot
        bind:this={refJSONEditorRoot}
        externalMode={mode}
        {content}
        {selection}
        {readOnly}
        {indentation}
        {tabSize}
        {truncateTextSize}
        {statusBar}
        {askToFormat}
        {escapeControlCharacters}
        {escapeUnicodeCharacters}
        {flattenColumns}
        {parser}
        {parseMemoizeOne}
        {validator}
        {validationParser}
        {pathParser}
        insideModal={false}
        {onError}
        onChange={handleChange}
        onChangeMode={toggleMode}
        onSelect={handleSelect}
        {onRenderValue}
        {onClassName}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {onRenderContextMenu}
        {onSortModal}
        {onJSONEditorModal}
      />
    {/key}
  </div>

  {#if sortModalProps}
    <SortModal
      {...sortModalProps}
      onClose={() => {
        sortModalProps?.onClose()
        sortModalProps = undefined
      }}
    />
  {/if}

  {#if jsonEditorModalProps}
    <JSONEditorModal
      {...jsonEditorModalProps}
      onClose={() => {
        jsonEditorModalProps?.onClose()
        jsonEditorModalProps = undefined
      }}
    />
  {/if}
</AbsolutePopup>

<style src="./JSONEditor.scss"></style>
