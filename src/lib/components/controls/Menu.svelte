<svelte:options immutable={true} />

<script lang="ts">
  import type { MenuItem } from '$lib/types'
  import { isMenuButton, isMenuSeparator, isMenuSpace } from '$lib/typeguards.js'

  // 左侧菜单
  export let items: MenuItem[] = []
  // 右侧菜单
  export let rightItems: MenuItem[] = []
  // 判断是否是 modal 中
  export let isModalLayer: boolean = false

  const isNoModalLayer = !isModalLayer

  function unknownMenuItem(item: MenuItem): string {
    console.error('Unknown type of menu item', item)
    return '???'
  }
</script>

<div class="jse-menu">
  <slot name="left" />

  {#each items as item}
    {#if isMenuSeparator(item)}
      <div class="jse-separator"></div>
    {:else if isMenuSpace(item)}
      <div class="jse-space"></div>
    {:else if isMenuButton(item)}
      <button
        type="button"
        class="jse-button {item.className}"
        on:click={item.onClick}
        title={item.title}
        disabled={item.disabled || false}
      >
        {#if item.icon}
          <svelte:component this={item.icon} />
        {/if}
        {#if item.text}
          {item.text}
        {/if}
      </button>
    {:else}
      {unknownMenuItem(item)}
    {/if}
  {/each}

  <slot name="right" />

  {#if isNoModalLayer}
    {#each rightItems as item}
      {#if isMenuSeparator(item)}
        <div class="jse-separator"></div>
      {:else if isMenuSpace(item)}
        <div class="jse-space"></div>
      {:else if isMenuButton(item)}
        <button
          type="button"
          class="jse-button {item.className}"
          on:click={item.onClick}
          title={item.title}
          disabled={item.disabled || false}
        >
          {#if item.icon}
            <svelte:component this={item.icon} />
          {/if}
          {#if item.text}
            {item.text}
          {/if}
        </button>
      {:else}
        {unknownMenuItem(item)}
      {/if}
    {/each}
  {/if}
</div>

<style src="./Menu.scss"></style>
