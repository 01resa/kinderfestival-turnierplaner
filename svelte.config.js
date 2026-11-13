import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
const config = {
	// Consult https://svelte.dev/docs#compile-time-svelte-preprocess
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	
	compilerOptions: {
		// Disable runes for Svelte 5 compatibility with legacy reactive statements
		runes: false
	}
};

export default config;
