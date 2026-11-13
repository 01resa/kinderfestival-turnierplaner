/**
 * Storage Service - Datenpersistenz für den Turnierplaner
 * 
 * Dieser Service verwaltet das Speichern und Laden des Turnier-Zustands
 * im Browser (IndexedDB und localStorage als Fallback).
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TournamentState } from '../models/types';

// ============================================================================
// INDEXEDDB DEFINITIONEN
// ============================================================================

/** Database Name */
const DATABASE_NAME = 'KinderfestivalTurnierplanerDB';

/** Database Version */
const DATABASE_VERSION = 1;

/** Datenbank-Schema */
interface TurnierplanerDB extends DBSchema {
	tournaments: {
		key: string;
		value: TournamentState;
		indexes: { name: string };
	};
	lastUsed: {
		key: string;
		value: string; // Tournament ID
	};
}

// ============================================================================
// INDEXEDDB INSTANZ
// ============================================================================

let dbPromise: Promise<IDBPDatabase<TurnierplanerDB>> | null = null;

/**
 * Öffnet die IndexedDB-Datenbank
 */
function getDB(): Promise<IDBPDatabase<TurnierplanerDB>> {
	if (!dbPromise) {
		dbPromise = openDB<TurnierplanerDB>(DATABASE_NAME, DATABASE_VERSION, {
			upgrade(db) {
				// Erstelle Store für Turniere
				db.createObjectStore('tournaments', { keyPath: 'id' });
				
				// Erstelle Index für den Namen
				const tournamentStore = db.transaction.objectStore('tournaments');
				tournamentStore.createIndex('name', 'config.name', { unique: false });
				
				// Erstelle Store für den letzten verwendeten Turnier
				db.createObjectStore('lastUsed');
			}
		});
	}
	return dbPromise;
}

// ============================================================================
// LOCALSTORAGE FALLBACK
// ============================================================================

const LOCALSTORAGE_KEY = 'kinderfestival_turnierplaner_state';

/**
 * Speichert im localStorage (Fallback)
 */
function saveToLocalStorage(state: TournamentState): void {
	try {
		localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(state));
	} catch (error) {
		console.warn('Konnte nicht im localStorage speichern:', error);
	}
}

/**
 * Lädt aus localStorage (Fallback)
 */
function loadFromLocalStorage(): TournamentState | null {
	try {
		const saved = localStorage.getItem(LOCALSTORAGE_KEY);
		if (saved) {
			return JSON.parse(saved);
		}
	} catch (error) {
		console.warn('Konnte nicht aus localStorage laden:', error);
	}
	return null;
}

/**
 * Löscht aus localStorage
 */
function clearLocalStorage(): void {
	try {
		localStorage.removeItem(LOCALSTORAGE_KEY);
	} catch (error) {
		console.warn('Konnte nicht aus localStorage löschen:', error);
	}
}

// ============================================================================
// SPEICHER-OPERATIONEN
// ============================================================================

/**
 * Speichert den Turnier-Zustand
 */
export async function saveTournamentState(state: TournamentState): Promise<void> {
	try {
		// Versuche IndexedDB
		const db = await getDB();
		const tx = db.transaction('tournaments', 'readwrite');
		const store = tx.objectStore('tournaments');
		
		// Speichere den Zustand mit dem Config-Name als ID
		const tournamentId = state.config.id || 'default';
		
		// Speichere auch den letzten verwendeten Turnier
		const lastUsedTx = db.transaction('lastUsed', 'readwrite');
		const lastUsedStore = lastUsedTx.objectStore('lastUsed');
		
		await store.put(state, tournamentId);
		await lastUsedStore.put(tournamentId, 'last');
		
		await tx.done;
		await lastUsedTx.done;
		
		// Fallback: localStorage
		saveToLocalStorage(state);
		
		console.log('Turnier-Zustand gespeichert');
	} catch (error) {
		console.error('Fehler beim Speichern in IndexedDB:', error);
		// Fallback: localStorage
		saveToLocalStorage(state);
	}
}

/**
 * Lädt den Turnier-Zustand
 */
export async function loadTournamentState(): Promise<TournamentState | null> {
	try {
		// Versuche IndexedDB
		const db = await getDB();
		
		// Lade den letzten verwendeten Turnier
		const lastUsedTx = db.transaction('lastUsed', 'readonly');
		const lastUsedStore = lastUsedTx.objectStore('lastUsed');
		const lastUsedId = await lastUsedStore.get('last');
		
		if (lastUsedId) {
			const tx = db.transaction('tournaments', 'readonly');
			const store = tx.objectStore('tournaments');
			const state = await store.get(lastUsedId);
			
			if (state) {
				console.log('Turnier-Zustand aus IndexedDB geladen');
				return state;
			}
		}
		
		// Wenn kein letzter verwendeter Turnier, lade das erste
		const tx = db.transaction('tournaments', 'readonly');
		const store = tx.objectStore('tournaments');
		const allStates = await store.getAll();
		
		if (allStates.length > 0) {
			// Nimm das neueste
			const newestState = allStates.reduce((a, b) => {
				return new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b;
			});
			console.log('Ersten Turnier-Zustand aus IndexedDB geladen');
			return newestState;
		}
		
	} catch (error) {
		console.error('Fehler beim Laden aus IndexedDB:', error);
	}
	
	// Fallback: localStorage
	const state = loadFromLocalStorage();
	if (state) {
		console.log('Turnier-Zustand aus localStorage geladen');
		return state;
	}
	
	return null;
}

/**
 * Lädt alle gespeicherten Turniere
 */
export async function loadAllTournaments(): Promise<TournamentState[]> {
	try {
		const db = await getDB();
		const tx = db.transaction('tournaments', 'readonly');
		const store = tx.objectStore('tournaments');
		return await store.getAll();
	} catch (error) {
		console.error('Fehler beim Laden aller Turniere:', error);
		return [];
	}
}

/**
 * Löscht einen Turnier-Zustand
 */
export async function deleteTournamentState(id: string): Promise<void> {
	try {
		const db = await getDB();
		const tx = db.transaction('tournaments', 'readwrite');
		const store = tx.objectStore('tournaments');
		
		// Lösche den Turnier
		await store.delete(id);
		
		// Prüfe, ob es der letzte verwendete war
		const lastUsedTx = db.transaction('lastUsed', 'readonly');
		const lastUsedStore = lastUsedTx.objectStore('lastUsed');
		const lastUsedId = await lastUsedStore.get('last');
		
		if (lastUsedId === id) {
			const lastUsedRwTx = db.transaction('lastUsed', 'readwrite');
			const lastUsedRwStore = lastUsedRwTx.objectStore('lastUsed');
			await lastUsedRwStore.delete('last');
			await lastUsedRwTx.done;
		}
		
		await tx.done;
		
		// Fallback: localStorage
		if (id === 'default') {
			clearLocalStorage();
		}
		
		console.log('Turnier-Zustand gelöscht');
	} catch (error) {
		console.error('Fehler beim Löschen des Turnier-Zustands:', error);
		// Fallback: localStorage
		clearLocalStorage();
	}
}

/**
 * Speichert einen benannten Turnier-Zustand
 */
export async function saveNamedTournament(name: string, state: TournamentState): Promise<string> {
	try {
		const db = await getDB();
		const tx = db.transaction('tournaments', 'readwrite');
		const store = tx.objectStore('tournaments');
		
		// Aktualisiere den Namen in der Konfiguration
		const stateWithName = {
			...state,
			config: {
				...state.config,
				name
			},
			updatedAt: new Date().toISOString()
		};
		
		const tournamentId = state.config.id || createId();
		
		await store.put(stateWithName, tournamentId);
		
		// Aktualisiere letzten verwendeten
		const lastUsedTx = db.transaction('lastUsed', 'readwrite');
		const lastUsedStore = lastUsedTx.objectStore('lastUsed');
		await lastUsedStore.put(tournamentId, 'last');
		
		await tx.done;
		await lastUsedTx.done;
		
		console.log('Benannter Turnier-Zustand gespeichert:', name);
		return tournamentId;
	} catch (error) {
		console.error('Fehler beim Speichern des benannten Turniers:', error);
		throw error;
	}
}

/**
 * Lädt einen Turnier-Zustand nach ID
 */
export async function loadTournamentById(id: string): Promise<TournamentState | null> {
	try {
		const db = await getDB();
		const tx = db.transaction('tournaments', 'readonly');
		const store = tx.objectStore('tournaments');
		return await store.get(id);
	} catch (error) {
		console.error('Fehler beim Laden des Turniers nach ID:', error);
		return null;
	}
}

// ============================================================================
// AUTOSAVE
// ============================================================================

let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
const AUTO_SAVE_DELAY = 1000; // 1 Sekunde

/**
 * Debounced Auto-Save
 */
export function triggerAutoSave(state: TournamentState): void {
	if (autoSaveTimeout) {
		clearTimeout(autoSaveTimeout);
	}
	
	autoSaveTimeout = setTimeout(async () => {
		try {
			await saveTournamentState(state);
		} catch (error) {
			console.error('Auto-Save fehlgeschlagen:', error);
		}
	}, AUTO_SAVE_DELAY);
}

/**
 * Bricht den Auto-Save ab
 */
export function cancelAutoSave(): void {
	if (autoSaveTimeout) {
		clearTimeout(autoSaveTimeout);
		autoSaveTimeout = null;
	}
}

// ============================================================================
// EXPORT / IMPORT
// ============================================================================

/**
 * Exportiert den Turnier-Zustand als JSON
 */
export function exportToJSON(state: TournamentState): string {
	return JSON.stringify(state, null, 2);
}

/**
 * Importiert einen Turnier-Zustand aus JSON
 */
export function importFromJSON(json: string): TournamentState | null {
	try {
		const state = JSON.parse(json);
		// Validierung wäre hier sinnvoll
		return state;
	} catch (error) {
		console.error('Fehler beim Importieren aus JSON:', error);
		return null;
	}
}

/**
 * Exportiert den Turnier-Zustand als Datei
 */
export function downloadAsFile(state: TournamentState, filename?: string): void {
	const data = exportToJSON(state);
	const blob = new Blob([data], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	
	const timestamp = new Date().toISOString().split('T')[0];
	const tournamentName = state.config.name || 'Turnier';
	const safeName = tournamentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
	const finalFilename = filename || `${safeName}_${timestamp}.json`;
	
	const link = document.createElement('a');
	link.href = url;
	link.download = finalFilename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	
	// Cleanup
	setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Importiert einen Turnier-Zustand aus einer Datei
 */
export function importFromFile(callback: (state: TournamentState | null) => void): void {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.json,application/json';
	
	input.onchange = (event) => {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const content = e.target?.result as string;
				const state = importFromJSON(content);
				callback(state);
			};
			reader.onerror = () => {
				callback(null);
			};
			reader.readAsText(file);
		} else {
			callback(null);
		}
	};
	
	input.click();
}

// ============================================================================
// HELFERFUNKTIONEN
// ============================================================================

/**
 * Erstellt eine einzigartige ID
 */
function createId(): string {
	return crypto.randomUUID();
}

/**
 * Löscht alle Daten
 */
export async function clearAllData(): Promise<void> {
	try {
		const db = await getDB();
		
		// Lösche alle Turniere
		const tx1 = db.transaction('tournaments', 'readwrite');
		const store1 = tx1.objectStore('tournaments');
		await store1.clear();
		await tx1.done;
		
		// Lösche letzten verwendeten
		const tx2 = db.transaction('lastUsed', 'readwrite');
		const store2 = tx2.objectStore('lastUsed');
		await store2.clear();
		await tx2.done;
		
		// Lösche localStorage
		clearLocalStorage();
		
		console.log('Alle Daten gelöscht');
	} catch (error) {
		console.error('Fehler beim Löschen aller Daten:', error);
		clearLocalStorage();
	}
}

/**
 * Prüft, ob Storage verfügbar ist
 */
export function isStorageAvailable(): boolean {
	try {
		// Prüfe localStorage
		const testKey = '__test__';
		localStorage.setItem(testKey, 'test');
		localStorage.removeItem(testKey);
		
		// Prüfe IndexedDB
		return typeof indexedDB !== 'undefined';
	} catch (error) {
		return false;
	}
}

/**
 * Prüft, ob Auto-Save aktiv ist
 */
export function isAutoSaveActive(): boolean {
	return autoSaveTimeout !== null;
}
