/**
 * Service Worker für die Kinderfestival Turnierplaner PWA
 * 
 * Implementiert Offline-Caching mit Workbox für:
 * - App Shell (HTML, CSS, JS, Icons)
 * - Spielplandaten
 * - Fallback-Strategien
 */

import { clientsClaim, skipWaiting } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// ============================================================================
// SERVICE WORKER INITIALISIERUNG
// ============================================================================

// Sofortige Aktivierung
clientsClaim();
skipWaiting();

// ============================================================================
// PRECACHING - APP SHELL
// ============================================================================

// Precache wird automatisch von Vite PWA generiert
// Diese Datei wird während des Build-Prozesses mit den Hashes der Dateien gefüllt
declare const self: ServiceWorkerGlobalScope;

// Falls Precache-Daten verfügbar sind
if (typeof __WB_MANIFEST !== 'undefined') {
	const manifest = __WB_MANIFEST;
	precacheAndRoute(manifest);
}

// ============================================================================
// CACHING STRATEGIEN
// ============================================================================

// Cache für API-Anfragen (falls wir später ein Backend haben)
registerRoute(
	/new (/api\/.*/),
	new NetworkFirst({
		cacheName: 'api-cache',
		plugins: [
			new CacheableResponsePlugin({
				statuses: [0, 200]
			}),
			new ExpirationPlugin({
				maxEntries: 100,
				maxAgeSeconds: 24 * 60 * 60 // 24 Stunden
			})
		]
	}),
	'GET'
);

// Cache für statische Assets (CSS, JS, Icons)
registerRoute(
	({ url: /\.(css|js|png|jpg|jpeg|svg|ico|woff2?)$/i }),
	new CacheFirst({
		cacheName: 'assets-cache',
		plugins: [
			new CacheableResponsePlugin({
				statuses: [0, 200]
			}),
			new ExpirationPlugin({
				maxEntries: 200,
				maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Tage
			})
		]
	})
);

// Cache für IndexedDB Daten (Spielplandaten)
// Diese werden clientseitig gespeichert, aber wir können sie auch cachen
registerRoute(
	({ url: /\/data\/.*/ }),
	new StaleWhileRevalidate({
		cacheName: 'data-cache',
		plugins: [
			new CacheableResponsePlugin({
				statuses: [0, 200]
			}),
			new ExpirationPlugin({
				maxEntries: 50,
				maxAgeSeconds: 7 * 24 * 60 * 60 // 7 Tage
			})
		]
	})
);

// ============================================================================
// OFFLINE FALLBACK
// ============================================================================

// Fallback für die Hauptseite
const FALLBACK_HTML_URL = '/index.html';

// Cache der Fallback-Seite
self.addEventListener('install', async (event) => {
	try {
		const cache = await caches.open('fallback-cache');
		const response = await fetch(FALLBACK_HTML_URL);
		if (response && response.ok) {
			await cache.put(FALLBACK_HTML_URL, response.clone());
		}
	} catch (error) {
		console.error('Fallback-Seite konnte nicht gecacht werden:', error);
	}
});

// Offline-Fallback für Navigation
self.addEventListener('fetch', async (event) => {
	if (event.request.mode === 'navigate') {
		try {
			// Versuche, die Anfrage zu behandeln
			const response = await fetch(event.request);
			return response;
		} catch (error) {
			// Falls offline, gebe die gecachte Fallback-Seite zurück
			const cache = await caches.open('fallback-cache');
			const fallbackResponse = await cache.match(FALLBACK_HTML_URL);
			if (fallbackResponse) {
				return fallbackResponse;
			}
			
			// Falls nichts gecacht ist, gebe eine einfache Offline-Seite zurück
			return new Response(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Offline - Kinderfestival Turnierplaner</title>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<style>
						body { font-family: Arial, sans-serif; text-align: center; padding: 2rem; }
						h1 { color: #6750a4; }
						p { color: #666; }
					</style>
				</head>
				<body>
					<h1>Offline</h1>
					<p>Du bist offline. Der Turnierplaner funktioniert aber weiterhin mit den lokal gespeicherten Daten.</p>
					<p><small>Verbinde dich mit dem Internet, um auf dem neuesten Stand zu bleiben.</small></p>
				</body>
				</html>
			`, {
				headers: { 'Content-Type': 'text/html; charset=UTF-8' }
			});
		}
	}
});

// ============================================================================
// BACKGROUND SYNC - DATEN SYNCHRONISATION
// ============================================================================

// Synchronisiere Daten im Hintergrund, wenn die Verbindung wiederhergestellt wird
const bgSyncPlugin = new BackgroundSyncPlugin('dataSyncQueue', {
	maxRetentionTime: 24 * 60 // 24 Stunden
});

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

// Push Notifications für Turniere (optional für zukünftige Erweiterungen)
self.addEventListener('push', (event) => {
	const data = event.data?.json();
	
	if (data && data.title && data.body) {
		event.waitUntil(
			self.registration.showNotification(data.title, {
				body: data.body,
				icon: '/icons/android-chrome-192x192.png',
				data: data.data || {},
				actions: data.actions || []
			})
		);
	}
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	
	if (event.notification.data && event.notification.data.url) {
		event.waitUntil(
			clients.openWindow(event.notification.data.url)
		);
	} else {
		event.waitUntil(
			clients.openWindow('/')
		);
	}
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

// Empfange Nachrichten von der Client-Seite
self.addEventListener('message', async (event) => {
	if (event.data && event.data.type) {
		switch (event.data.type) {
			case 'SKIP_WAITING':
				self.skipWaiting();
				break;
			
			case 'CACHE_DATA':
				// Cache spezifische Daten
				try {
					const cache = await caches.open('custom-data-cache');
					await cache.put(event.data.url, event.data.response);
				} catch (error) {
					console.error('Fehler beim Cachen der Daten:', error);
				}
				break;
			
			case 'CLEAR_CACHE':
				// Cache löschen
				try {
					const cacheNames = await caches.keys();
					for (const cacheName of cacheNames) {
						if (cacheName !== 'workbox-precaching-v2:https://...') {
							await caches.delete(cacheName);
						}
					}
				} catch (error) {
					console.error('Fehler beim Löschen des Cache:', error);
				}
				break;
			
			case 'GET_CACHED_DATA':
				// Gecachte Daten abrufen
				try {
					const cache = await caches.open('custom-data-cache');
					const response = await cache.match(event.data.url);
					if (response) {
						event.source?.postMessage({
							type: 'CACHED_DATA_RESPONSE',
							url: event.data.url,
							data: await response.json()
						});
					}
				} catch (error) {
					console.error('Fehler beim Abrufen der gecachten Daten:', error);
				}
				break;
		}
	}
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Globales Error-Handling
self.addEventListener('error', (errorEvent) => {
	console.error('Service Worker Error:', errorEvent.error);
});

self.addEventListener('unhandledrejection', (event) => {
	console.error('Unhandled Rejection:', event.reason);
});

// ============================================================================
// LIFECYCLE EVENTS
// ============================================================================

self.addEventListener('install', (event) => {
	console.log('[Service Worker] Installiert');
	
	// Zwinge die Warten auf den Service Worker zu überspringen
	event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
	console.log('[Service Worker] Aktiviert');
	
	// Lösche alte Caches
	event.waitUntil(
		caches.keys().then(async (cacheNames) => {
			for (const cacheName of cacheNames) {
				// Lösche alle Caches, die nicht von Workbox sind
				if (!cacheName.includes('workbox') && !cacheName.includes('fallback')) {
					await caches.delete(cacheName);
				}
			}
			
			// Übernehme die Kontrolle über alle Clients
			return clients.claim();
		})
	);
});

// ============================================================================
// EXPORT
// ============================================================================

export {};
