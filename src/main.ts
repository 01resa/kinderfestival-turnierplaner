/**
 * Haupt-Einstiegspunkt der Anwendung
 * 
 * Lädt die Svelte-App und mountet sie an das DOM-Element #svelte
 */

import App from './App.svelte';

// Mount die App an das DOM-Element
const app = new App({
	target: document.getElementById('svelte')
});

export default app;
