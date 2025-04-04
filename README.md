# fork
fork from https://github.com/josdejong/svelte-jsoneditor

# useage
use codemirror 6

### vue

components/vue-jsoneditor.vue
```vue
<template>
  <div className="vue-jsoneditor" ref="editor"></div>
</template>

<script>
import { createJSONEditor } from 'vanilla-jsoneditor';

// JSONEditor properties as of version 2.3.1
const supportedPropNames = [
  'content',
  'selection',
  'readOnly',
  'indentation',
  'tabSize',
  'mode',
  'mainMenuBar',
  'navigationBar',
  'statusBar',
  'askToFormat',
  'escapeControlCharacters',
  'escapeUnicodeCharacters',
  'flattenColumns',
  'parser',
  'validator',
  'validationParser',
  'pathParser',
  'queryLanguages',
  'queryLanguageId',
  'onChangeQueryLanguage',
  'onChange',
  'onRenderValue',
  'onClassName',
  'onRenderMenu',
  'onRenderContextMenu',
  'onChangeMode',
  'onSelect',
  'onError',
  'onFocus',
  'onBlur',
];
const supportedPropNamesSet = new Set(supportedPropNames);

function filterProps(props, prevProps) {
  return Object.fromEntries(
    Object.entries(props)
      .filter(([key, value]) => supportedPropNamesSet.has(key))
      .filter(([key, value]) => value !== prevProps[key])
  );
}

export default {
  name: 'VueJSONEditor',
  props: supportedPropNames,
  mounted() {
    // filter the props that actually changed
    // since the last time to prevent syncing issues
    const props = filterProps(this, {});
    this.prevProps = props;

    this.editor = createJSONEditor({
      target: this.$refs['editor'],
      props,
    });
    console.log('create editor', this.editor, props);
  },
  updated() {
    const updatedProps = filterProps(this, this.prevProps);
    console.log('update props', updatedProps);
    this.prevProps = updatedProps;
    this.editor.updateProps(updatedProps);
  },
  beforeUnmount() {
    console.log('destroy editor');
    this.editor.destroy();
    this.editor = null;
  },
};
</script>

<style scoped>
.vue-jsoneditor {
  display: flex;
  flex: 1;
}
</style>
```

page/index.vue
```vue
<template>
<VueJSONEditor
  v-if="showEditor"
  :content="content"
  :onChange="onChange"
  :readOnly="readOnly"
/>
</template>
<script>
import VueJSONEditor from './components/VueJSONEditor.vue';
const showEditor = ref(true)
const readOnly = ref(false)
const content = ref({
  json: {
    greeting: 'Hello World',
    color: '#ff3e00',
    ok: true,
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  text: undefined,
})
const onChange = function (content) {
  console.log('onChange', content);
  this.content = content;
}
</script>
```


### react
components/vue-jsoneditor.tsx

```tsx
import {
  createJSONEditor,
  JSONEditorPropsOptional,
  JsonEditor,
} from 'vanilla-jsoneditor';
import { useEffect, useRef } from 'react';
import './VanillaJSONEditor.css';

export default function SvelteJSONEditor(props: JSONEditorPropsOptional) {
  const refContainer = useRef<HTMLDivElement | null>(null);
  const refEditor = useRef<JsonEditor | null>(null);
  const refPrevProps = useRef<JSONEditorPropsOptional>(props);

  useEffect(() => {
    // create editor
    console.log('create editor', refContainer.current);
    refEditor.current = createJSONEditor({
      target: refContainer.current as HTMLDivElement,
      props,
    });

    return () => {
      // destroy editor
      if (refEditor.current) {
        console.log('destroy editor');
        refEditor.current.destroy();
        refEditor.current = null;
      }
    };
  }, []);

  // update props
  useEffect(() => {
    if (refEditor.current) {
      // only pass the props that actually changed
      // since the last time to prevent syncing issues
      const changedProps = filterUnchangedProps(props, refPrevProps.current);
      console.log('update props', changedProps);
      refEditor.current.updateProps(changedProps);
      refPrevProps.current = props;
    }
  }, [props]);

  return <div className="vanilla-jsoneditor-react" ref={refContainer}></div>;
}

function filterUnchangedProps(
  props: JSONEditorPropsOptional,
  prevProps: JSONEditorPropsOptional
): JSONEditorPropsOptional {
  return Object.fromEntries(
    Object.entries(props).filter(
      ([key, value]) =>
        value !== prevProps[key as keyof JSONEditorPropsOptional]
    )
  );
}
```

page/index.tsx

```tsx
import { useState } from 'react';
import VanillaJSONEditor from './VanillaJSONEditor';
import { type Content } from 'vanilla-jsoneditor';

function App() {
  const [showEditor, setShowEditor] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [content, setContent] = useState<Content>({
    json: {
      greeting: 'Hello World',
      color: '#ff3e00',
      ok: true,
      values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    },
    text: undefined,
  });

  return (
    {showEditor && (
      <VanillaJSONEditor
        content={content}
        readOnly={readOnly}
        onChange={setContent}
      />
    )}
  );
}

export default App;
```