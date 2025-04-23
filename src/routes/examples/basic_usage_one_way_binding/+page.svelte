<script>
  import { JSONEditor } from 'codemirror-json'

  let emitter = null

  let content = $state({
    text: undefined, // can be used to pass a stringified JSON document instead
    json: {
      array: [1, 2, 3],
      boolean: true,
      color: '#82b92c',
      null: null,
      number: 123,
      object: { a: 'b', c: 'd' },
      string: 'Hello World'
    }
  })

  function handleChange(updatedContent) {
    console.log('contents changed:', updatedContent)
    content = updatedContent
  }
  // ------------
  function handleSetMitt(o) {
    emitter = o
    console.log('-------------------------------emitter', emitter)
  }
  function handleExpandAll() {
    emitter.emit('onExpandAll', 'tree')
  }
  function handleCollapseAll() {
    emitter.emit('onCollapseAll', 'tree')
  }
  function handleSortAll() {
    emitter.emit('onSortAll', 'tree')
  }
  function handleUndo() {
    emitter.emit('onUndo', 'tree')
  }
  function handleRedo() {
    emitter.emit('onRedo', 'tree')
  }
  function handleFullscreen() {
    emitter.emit('onFullscreen', 'tree')
  }
  function handleCopy() {
    emitter.emit('onCopy', 'tree')
  }
  function handleChangeMode(mode) {
    emitter.emit('onChangeMode', mode)
  }
</script>

<svelte:head>
  <title>Basic usage (one-way binding) | codemirror-json</title>
</svelte:head>

<h1>Basic usage (one-way binding)</h1>

<p>
  Use JSONEditor with one-way binding: pass read-only property <code>content</code>, and pass an
  <code>onChange</code> callback function to receive changes.
</p>

<button onclick={() => handleChangeMode('text')}>text</button>
<button onclick={() => handleChangeMode('tree')}>tree</button>
<button onclick={() => handleChangeMode('table')}>table</button>
<br />
<button onclick={handleExpandAll}>onExpandAll</button>
<button onclick={handleCollapseAll}>onExpandAll</button>
<button onclick={handleSortAll}>onSortAll</button>
<button onclick={handleUndo}>onUndo</button>
<button onclick={handleRedo}>onRedo</button>
<button onclick={handleFullscreen}>onFullscreen</button>
<button onclick={handleCopy}>onCopy</button>

<div class="editor">
  <JSONEditor {content} onChange={handleChange} onSetMitt={handleSetMitt} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
