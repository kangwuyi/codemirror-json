<script lang="ts">
  import type { JSONPath } from 'immutable-json-patch'
  import { getIn, isJSONArray, isJSONObject } from 'immutable-json-patch'
  import type { JSONParser, OnChangeMode } from '$lib/types.js'
  import { Mode } from '$lib/types.js'
  import { valueType } from '$lib/utils/typeUtils.js'
  import { findNestedArrays } from '$lib/logic/table.js'
  import { isEmpty } from 'lodash-es'
  import { stringifyJSONPath } from '$lib/utils/pathUtils.js'

  interface Props {
    text: string | undefined
    json: unknown | undefined
    readOnly: boolean
    parser: JSONParser
    openJSONEditorModal: (path: JSONPath) => void
    extractPath: (path: JSONPath) => void
    onChangeMode: OnChangeMode
    onClick: () => void
  }

  const {
    text,
    json,
    readOnly,
    parser,
    openJSONEditorModal,
    extractPath,
    onChangeMode,
    onClick
  }: Props = $props()

  const nestedArrayPaths: JSONPath[] = $derived(
    json
      ? findNestedArrays(json)
          .slice(0, 99)
          .filter((path) => path.length > 0)
      : []
  )
  const hasNestedArrays = $derived(!isEmpty(nestedArrayPaths))
  const isEmptyDocument = $derived(json === undefined && (text === '' || text === undefined))

  const documentType = $derived(
    hasNestedArrays
      ? '对象中的数组'
      : isEmptyDocument
        ? '空文档'
        : isJSONObject(json)
          ? '对象'
          : isJSONArray(json)
            ? '空数组' // note: can also be an array with objects but without properties
            : `A ${valueType(json, parser)}`
  )

  function countItems(nestedArrayPath: JSONPath): number {
    return (getIn(json, nestedArrayPath) as JSONPath).length
  }
</script>

<div class="jse-table-mode-welcome" onclick={() => onClick()} role="none">
  <div class="jse-nested-arrays">
    <div class="jse-nested-arrays-title">{documentType}</div>
    <div class="jse-nested-arrays-info">
      <b>
        {#if hasNestedArrays}
          对象(缺少数组格式子属性)
        {:else if isEmptyDocument && !readOnly}
          空文档
        {:else}
          {documentType}
        {/if}
      </b>
      不能在 TABLE 模式下打开, 需要在 TEXT 或 TREE 模式下编辑 JSON 文档或使用快捷键 <b>Ctrl+V</b> 粘贴文档到此处
    </div>
    {#each nestedArrayPaths as nestedArrayPath}
      {@const count = countItems(nestedArrayPath)}

      <div class="jse-nested-property">
        <div class="jse-nested-property-path">
          "{stringifyJSONPath(nestedArrayPath)}"
          <span class="jse-nested-property-count">({count} {count !== 1 ? 'items' : 'item'})</span>
        </div>

        <button
          type="button"
          class="jse-nested-array-action"
          onclick={() => openJSONEditorModal(nestedArrayPath)}
        >
          {readOnly ? '查看' : '编辑'}
        </button>
        {#if !readOnly}
          <button
            type="button"
            class="jse-nested-array-action"
            onclick={() => extractPath(nestedArrayPath)}
          >
            提取
          </button>
        {/if}
      </div>
    {/each}
    <div class="jse-nested-button-box">
      <button type="button" class="jse-nested-array-action" onclick={() => onChangeMode(Mode.tree)}>
        切换 TREE 模式
      </button>
    </div>
  </div>
</div>

<style src="./TableModeWelcome.scss"></style>
