<script>
  import { JSONEditor } from 'codemirror-json'

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
</script>

<svelte:head>
  <title>Basic usage (one-way binding) | codemirror-json</title>
</svelte:head>

<p>javascript editor</p>

<div class="editor">
  <JSONEditor {content} onChange={handleChange} mode="javascript" />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
