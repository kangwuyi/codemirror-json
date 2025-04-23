<script lang="ts">
  import { IconBrackets, IconBraces } from '@tabler/icons-svelte'
  interface Props {
    readOnly: boolean
    onCreateArray: () => void
    onCreateObject: () => void
    onClick: () => void
  }

  const { readOnly, onCreateArray, onCreateObject, onClick }: Props = $props()

  function handleCreateObject(event: MouseEvent) {
    event.stopPropagation()
    onCreateObject()
  }

  function handleCreateArray(event: MouseEvent) {
    event.stopPropagation()
    onCreateArray()
  }
</script>

<div class="empty-container" onclick={() => onClick()} role="none">
  <div class="empty-content">
    <div class="empty-title">空文档</div>
    {#if !readOnly}
      <div class="empty-info">
        可以使用快捷键 <b>Ctrl+V</b> 粘贴 JSON 文档到此区域
      </div>
      <div class="empty-button-box">
        <button title="创建对象" onclick={handleCreateObject}
          ><IconBraces size={16} /> 创建对象</button
        >
        <button title="创建数组" onclick={handleCreateArray}
          ><IconBrackets size={16} />创建数组</button
        >
      </div>
    {/if}
  </div>
</div>

<style src="./Welcome.scss"></style>
