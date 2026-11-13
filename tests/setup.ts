/**
 * Vitest Setup File
 * 
 * Globale Konfiguration für alle Tests.
 */

import { expect } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest expect with Jest DOM matchers
expect.extend(matchers);

// Cleanup nach jedem Test
beforeEach(() => {
	// Reset Date Mock
	jest.useRealTimers();
});

// Cleanup DOM nach jedem Test
afterEach(() => {
	cleanup();
});

// Mock für crypto.randomUUID
beforeAll(() => {
	// Polyfill für UUID in Testumgebung
	if (!globalThis.crypto) {
		globalThis.crypto = {} as any;
	}
	
	if (!globalThis.crypto.randomUUID) {
		let counter = 0;
		globalThis.crypto.randomUUID = () => {
			return `test-uuid-${counter++}`;
		};
	}
});

// Mock für Date.now
vi.useRealTimers();

// Typ-Erweiterungen
declare module 'vitest' {
	interface Assertion {
		toBeInTheDocument(): void;
		toHaveTextContent(text: string | RegExp): void;
		toContainHTML(html: string): void;
	}
}
