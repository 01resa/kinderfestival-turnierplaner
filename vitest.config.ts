import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['tests/**/*.{test,spec}.{js,ts,svelte}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*'],
			exclude: [
				'src/**/*.d.ts',
				'src/**/*.css',
				'src/**/*.svelte',
				'**/node_modules/**',
				'**/dist/**',
				'**/.svelte-kit/**'
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80
			}
		},
		// Svelte spezifische Konfiguration
		deps: {
			inline: [/svelte/]
		},
		// Timeout für langsame Tests
		testTimeout: 10000,
		// Setup Datei für globale Konfiguration
		setupFiles: ['./tests/setup.ts']
	}
});
