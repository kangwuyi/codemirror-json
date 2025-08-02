import path from 'path'
import { sveltekit } from '@sveltejs/kit/vite'
import devtoolsjson from 'vite-plugin-devtools-json'

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit(), devtoolsjson()],
  resolve: {
    alias: {
      'codemirror-json': path.resolve('src/lib'),
    },
  },
}

export default config
