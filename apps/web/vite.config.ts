import { defineConfig } from 'vite';

import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    allowedHosts: ['localhost', '.local', '.kvsh.my.id'],
  },
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter(),
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
      },
      alias: {
        $components: 'src/components/*',
      },
    }),
  ],
});
