/**
 * Datenmodelle für den Kinderfestival Turnierplaner
 * 
 * Diese Typen definieren die Struktur aller Daten in der Anwendung.
 * Sie sind so gestaltet, dass sie sowohl clientseitig (IndexedDB)
 * als auch zukünftig serverseitig (Backend) verwendet werden können.
 */

// ============================================================================
// BASIS TYPEN
// ============================================================================

/** Eindeutige Identifier - UUID v4 Format */
export type UUID = string;

/** ISO 8601 Datumsstring */
export type ISODateString = string;

/** Ergebnis eines Spiels */
export type MatchResult = {
	goalsA: number;
	goalsB: number;
	winner?: UUID; // Team ID des Gewinners, undefined bei Unentschieden
} | null;

// ============================================================================
// VEREIN & TEAM
// ============================================================================

/** Ein Verein/Fußballclub */
export interface Club {
	id: UUID;
	name: string;
	createdAt: ISODateString;
	updatedAt: ISODateString;
}

/** Ein Team innerhalb eines Vereins */
export interface Team {
	id: UUID;
	clubId: UUID;
	/** Römische Nummer (I, II, III, IV, V, ...) */
	romanNumber: string;
	/** Vollständiger Name (z.B. "FC Musterhausen I") */
	name: string;
	createdAt: ISODateString;
	updatedAt: ISODateString;
}

// ============================================================================
// SPIELFELD TYPEN
// ============================================================================

/** Typ eines Spielfelds */
export type FieldType = 
	| 'jugendtore'    // Jugendtore
	| 'monitore'      // Monitore
	| 'kleinfeld'     // Kleinfeld
	| 'grossfeld'     // Großfeld
	| 'halle'         // Halle
	| 'custom';       // Benutzerdefiniert

/** Ein Spielfeld */
export interface Field {
	id: UUID;
	name: string;
	type: FieldType;
	customType?: string; // Nur wenn type === 'custom'
	createdAt: ISODateString;
	updatedAt: ISODateString;
}

// ============================================================================
// TURNIER KONFIGURATION
// ============================================================================

/** Turnier-Konfiguration */
export interface TournamentConfig {
	id: UUID;
	// Spielparameter
	rounds: number;           // Anzahl der Spielrunden (Default: 5)
	matchDuration: number;   // Spieldauer in Minuten (Default: 10)
	breakDuration: number;   // Pausen zwischen Spielen in Minuten (Default: 3)
	// Zeitplan
	startDateTime: ISODateString; // Startdatum und -uhrzeit
	// Spielfelder
	fields: Field[];
	// Metadaten
	name: string;            // Turniername (optional)
	createdAt: ISODateString;
	updatedAt: ISODateString;
}

// ============================================================================
// SPIEL (MATCH)
// ============================================================================

/** Konflikt-Typen für Spiele */
export type ConflictType = 'derby' | 'repeat' | 'time_overlap' | 'field_overlap';

/** Konflikt-Information */
export interface ConflictInfo {
	type: ConflictType;
	message: string;
	severity: 'warning' | 'error';
}

/** Ein Spiel im Turnier */
export interface Match {
	id: UUID;
	// Rundenzugehörigkeit
	round: number;
	// Zeitplan
	fieldId: UUID;
	startTime: ISODateString;
	endTime: ISODateString;
	// Teams
	teamAId: UUID;
	teamBId: UUID;
	// Ergebnisse
	result: MatchResult;
	// Konflikte & Warnungen
	isDerby: boolean;           // Vereins-Duell (Teams desselben Vereins)
	isRepeat: boolean;          // Doppelbegegnung (bereits gegangen)
	conflicts: ConflictInfo[];  // Liste aller Konflikte
	// Metadaten
	createdAt: ISODateString;
	updatedAt: ISODateString;
}

// ============================================================================
// SPIELPLAN
// ============================================================================

/** Spielplan für ein Turnier */
export interface Schedule {
	id: UUID;
	tournamentConfigId: UUID;
	matches: Match[];
	// Statistiken
	statistics: {
		totalMatches: number;
		matchesPerTeam: Record<UUID, number>;
		derbyCount: number;
		repeatCount: number;
		minMatchesPerTeam: number;
		maxMatchesPerTeam: number;
		avgMatchesPerTeam: number;
		conflictSummary: ConflictInfo[];
	};
	generatedAt: ISODateString;
	updatedAt: ISODateString;
}

// ============================================================================
// COMPLETE TURNIER STATE
// ============================================================================

/** Kompletter Turnier-Zustand */
export interface TournamentState {
	version: string; // Schema Version
	clubs: Club[];
	teams: Team[];
	fields: Field[];
	config: TournamentConfig;
	schedule: Schedule | null;
	// UI State (optional, nicht persistent)
	uiState?: {
		currentStep: number; // 1=Vereine, 2=Konfig, 3=Spielplan
		isSettingsExpanded: boolean;
		lastCalculationTime: ISODateString | null;
	};
	// Metadaten
	createdAt: ISODateString;
	updatedAt: ISODateString;
}

// ============================================================================
// FABRIKEN & HELFER
// ============================================================================

/** Konvertiert Nummer zu römischer Ziffer */
export function toRoman(num: number): string {
	const romanNumerals = [
		{ value: 1000, symbol: 'M' },
		{ value: 900, symbol: 'CM' },
		{ value: 500, symbol: 'D' },
		{ value: 400, symbol: 'CD' },
		{ value: 100, symbol: 'C' },
		{ value: 90, symbol: 'XC' },
		{ value: 50, symbol: 'L' },
		{ value: 40, symbol: 'XL' },
		{ value: 10, symbol: 'X' },
		{ value: 9, symbol: 'IX' },
		{ value: 5, symbol: 'V' },
		{ value: 4, symbol: 'IV' },
		{ value: 1, symbol: 'I' }
	];
	
	let result = '';
	for (const { value, symbol } of romanNumerals) {
		while (num >= value) {
			result += symbol;
			num -= value;
		}
	}
	return result;
}

/** Konvertiert römische Ziffer zu Nummer */
export function fromRoman(roman: string): number {
	const romanMap: Record<string, number> = {
		I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000
	};
	
	let result = 0;
	let prevValue = 0;
	
	for (let i = roman.length - 1; i >= 0; i--) {
		const char = roman[i].toUpperCase();
		const value = romanMap[char] || 0;
		
		if (value < prevValue) {
			result -= value;
		} else {
			result += value;
		}
		prevValue = value;
	}
	
	return result;
}

/** Erstellt eine neue UUID */
export function createUUID(): UUID {
	return crypto.randomUUID();
}

/** Aktuelles Datum als ISOString */
export function nowISO(): ISODateString {
	return new Date().toISOString();
}

// ============================================================================
// DEFAULTS
// ============================================================================

/** Default Field-Typen */
export const DEFAULT_FIELD_TYPES: FieldType[] = ['jugendtore', 'monitore', 'kleinfeld'];

/** Default Turnier-Konfiguration */
export const DEFAULT_TOURNAMENT_CONFIG: Omit<TournamentConfig, 'id' | 'createdAt' | 'updatedAt' | 'startDateTime'> = {
	name: 'Neues Turnier',
	rounds: 5,
	matchDuration: 10,
	breakDuration: 3,
	fields: []
};

/** Nächster Samstag, 10:30 Uhr */
export function getDefaultStartDateTime(): Date {
	const now = new Date();
	const dayOfWeek = now.getDay(); // 0 = Sonntag, 6 = Samstag
	
	// Berechne Tage bis zum nächsten Samstag
	let daysToSaturday = 6 - dayOfWeek;
	if (daysToSaturday <= 0) {
		daysToSaturday += 7;
	}
	
	const nextSaturday = new Date(now);
	nextSaturday.setDate(now.getDate() + daysToSaturday);
	nextSaturday.setHours(10, 30, 0, 0);
	
	return nextSaturday;
}
