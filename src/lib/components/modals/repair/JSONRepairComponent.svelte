<svelte:options immutable={true} />

<script lang="ts">
  import {
    IconSettingsBolt,
    IconX,
    IconCheck,
    IconChevronDown,
    IconAlertSquareRounded
  } from '@tabler/icons-svelte'

  import { createDebug } from '$lib/utils/debug.js'
  import Message from '../../controls/Message.svelte'
  import { normalizeJsonParseError } from '$lib/utils/jsonUtils.js'
  import type { MenuItem, ParseError } from '$lib/types.js'

  export let text = ''
  export let readOnly = false
  export let onParse: (text: string) => void
  export let onRepair: (text: string) => string
  export let onChange: ((updatedText: string) => void) | undefined = undefined
  export let onApply: (repairedText: string) => void
  export let onCancel: () => void

  const debug = createDebug('jsoneditor:JSONRepair')

  let domTextArea: HTMLTextAreaElement

  $: error = getErrorMessage(text)
  $: repairable = isRepairable(text)

  $: debug('error', error)

  function getErrorMessage(jsonText: string): ParseError | undefined {
    try {
      onParse(jsonText)
      return undefined
    } catch (err) {
      return normalizeJsonParseError(jsonText, (err as Error).message)
    }
  }

  function isRepairable(jsonText: string) {
    try {
      onRepair(jsonText)
      return true
    } catch {
      return false
    }
  }

  function goToError() {
    if (domTextArea && error) {
      const position = error.position !== undefined ? error.position : 0
      domTextArea.setSelectionRange(position, position)
      domTextArea.focus()
    }
  }

  function handleChange(event: Event & { currentTarget: EventTarget & HTMLTextAreaElement }) {
    debug('handleChange')

    const value = (event.target as HTMLTextAreaElement).value

    if (text === value) {
      return
    }

    text = value

    if (onChange) {
      onChange(text)
    }
  }

  function handleApply() {
    onApply(text)
  }

  function handleRepair() {
    try {
      // TODO: simpleJsonRepair should also partially apply fixes. Now it's all or nothing
      text = onRepair(text)

      if (onChange) {
        onChange(text)
      }
    } catch {
      // no need to do something with the error
    }
  }

  let items: MenuItem[]
  $: items = [
    {
      type: 'space'
    },
    {
      type: 'button',
      icon: IconX,
      title: 'Cancel repair',
      className: 'jse-cancel',
      onClick: onCancel
    }
  ]

  $: gotoAction = {
    icon: IconChevronDown,
    text: 'Show me',
    title: 'Scroll to the error location',
    onClick: goToError
  }

  $: repairAction = {
    icon: IconSettingsBolt,
    text: 'Auto repair',
    title: 'Automatically repair JSON',
    onClick: handleRepair
  }

  $: errorActions = repairable ? [gotoAction, repairAction] : [gotoAction]

  $: successActions = [
    {
      icon: IconCheck,
      text: 'Apply',
      title: 'Apply fixed JSON',
      disabled: readOnly,
      onClick: handleApply
    }
  ]
</script>

<div class="jse-json-repair-component">
  {#if error}
    <Message
      type="error"
      icon={IconAlertSquareRounded}
      message={`Cannot parse JSON: ${error.message}`}
      actions={errorActions}
    />
  {:else}
    <Message
      type="success"
      message="JSON is valid now and can be parsed."
      actions={successActions}
    />
  {/if}
  <textarea
    bind:this={domTextArea}
    on:input={handleChange}
    readonly={readOnly}
    class="jse-json-text"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false">{text}</textarea
  >
</div>

<style src="./JSONRepairComponent.scss"></style>
