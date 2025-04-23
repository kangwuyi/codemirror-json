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
  function handleExpandAll(mode) {
    emitter.emit('onExpandAll', mode)
  }
  function handleCollapseAll(mode) {
    emitter.emit('onCollapseAll', mode)
  }
  function handleSortAll(mode) {
    emitter.emit('onSortAll', mode)
  }
  function handleUndo() {
    emitter.emit('onUndo', 'tree')
  }
  function handleRedo(mode) {
    emitter.emit('onRedo', mode)
  }
  function handleFullscreen(mode) {
    emitter.emit('onFullscreen', mode)
  }
  function handleCopy(mode) {
    emitter.emit('onCopy', mode)
  }
  function handleChangeMode(mode) {
    emitter.emit('onChangeMode', mode)
  }
  function handleFormat(mode) {
    emitter.emit('onFormat', mode)
  }
  function handleCompact(mode) {
    emitter.emit('onCompact', mode)
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
tree
<button onclick={() => handleExpandAll('tree')}>onExpandAll</button>
<button onclick={() => handleCollapseAll('tree')}>onCollapseAll</button>
<button onclick={() => handleSortAll('tree')}>onSortAll</button>
<button onclick={() => handleUndo('tree')}>onUndo</button>
<button onclick={() => handleRedo('tree')}>onRedo</button>
<button onclick={() => handleFullscreen('tree')}>onFullscreen</button>
<button onclick={() => handleCopy('tree')}>onCopy</button>
<br />
text
<button onclick={() => handleFormat('text')}>onFormat</button>
<button onclick={() => handleCompact('text')}>onCompact</button>
<button onclick={() => handleSortAll('text')}>onSortAll</button>
<button onclick={() => handleUndo('text')}>onUndo</button>
<button onclick={() => handleRedo('text')}>onRedo</button>
<button onclick={() => handleFullscreen('text')}>onFullscreen</button>
<br />
table
<button onclick={() => handleSortAll('table')}>onSortAll</button>
<button onclick={() => handleUndo('table')}>onUndo</button>
<button onclick={() => handleRedo('table')}>onRedo</button>
<button onclick={() => handleFullscreen('table')}>onFullscreen</button>
<button onclick={() => handleCopy('table')}>onCopy</button>
<br />

<div class="editor">
  <JSONEditor {content} onChange={handleChange} onSetMitt={handleSetMitt} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
