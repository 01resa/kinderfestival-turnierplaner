/**
 * Tournament Store - Zentraler Store für den Turnier-Zustand
 * 
 * Dieser Store verwaltet den kompletten Turnier-Zustand und bietet
 * Methoden zur Manipulation der Daten an.
 */

import { writable, derived, type Writable, type Readable } from 'svelte/store';
import type {
	TournamentState,
	Club,
	Team,
	Field,
	TournamentConfig,
	Schedule,
	UUID
} from '../models/types';
import { createUUID, nowISO, DEFAULT_TOURNAMENT_CONFIG, getDefaultStartDateTime } from '../models/types';
import { validateTournamentState } from '../models/validation';

// ============================================================================
// STORE DEFINITION
// ============================================================================

/** Initialer Turnier-Zustand */
function createInitialState(): TournamentState {
	const defaultStartDate = getDefaultStartDateTime();
	
	return {
		version: '1.0',
		clubs: [],
		teams: [],
		fields: [],
		config: {
			...DEFAULT_TOURNAMENT_CONFIG,
			id: createUUID(),
			startDateTime: defaultStartDate.toISOString(),
			createdAt: nowISO(),
			updatedAt: nowISO(),
			fields: []
		},
		schedule: null,
		uiState: {
			currentStep: 1,
			isSettingsExpanded: true,
			lastCalculationTime: null
		},
		createdAt: nowISO(),
		updatedAt: nowISO()
	};
}

/** Haupt-Store */
const tournamentState = writable<TournamentState>(createInitialState());

// ============================================================================
// ABGELEITETE STORES
// ============================================================================

/** Liste aller Vereine */
export const clubs: Readable<Club[]> = derived(tournamentState, $state => $state.clubs);

/** Liste aller Teams */
export const teams: Readable<Team[]> = derived(tournamentState, $state => $state.teams);

/** Liste aller Spielfelder */
export const fields: Readable<Field[]> = derived(tournamentState, $state => $state.fields);

/** Turnier-Konfiguration */
export const config: Readable<TournamentConfig> = derived(tournamentState, $state => $state.config);

/** Spielplan */
export const schedule: Readable<Schedule | null> = derived(tournamentState, $state => $state.schedule);

/** UI-Zustand */
export const uiState: Readable<TournamentState['uiState']> = derived(
	tournamentState,
	$state => $state.uiState
);

/** Teams nach Verein gruppiert */
export const teamsByClub: Readable<Record<UUID, Team[]>> = derived(
	tournamentState,
	$state => {
		const grouped: Record<UUID, Team[]> = {};
		for (const team of $state.teams) {
			if (!grouped[team.clubId]) {
				grouped[team.clubId] = [];
			}
			grouped[team.clubId].push(team);
		}
		return grouped;
	}
);

/** Anzahl der Vereine */
export const clubCount: Readable<number> = derived(clubs, $clubs => $clubs.length);

/** Anzahl der Teams */
export const teamCount: Readable<number> = derived(teams, $teams => $teams.length);

/** Anzahl der Spielfelder */
export const fieldCount: Readable<number> = derived(fields, $fields => $fields.length);

/** Validierungsstatus */
export const isValid: Readable<boolean> = derived(
	tournamentState,
	$state => validateTournamentState($state).valid
);

/** Validierungsfehler */
export const validationErrors: Readable<string[]> = derived(
	tournamentState,
	$state => {
		const result = validateTournamentState($state);
		return result.errors.map(e => `${e.field}: ${e.message}`);
	}
);

/** Validierungswarnungen */
export const validationWarnings: Readable<string[]> = derived(
	tournamentState,
	$state => {
		const result = validateTournamentState($state);
		return result.warnings.map(w => `${w.field}: ${w.message}`);
	}
);

// ============================================================================
// AKTIONEN - VEREINE
// ============================================================================

/**
 * Fügt einen neuen Verein hinzu
 */
export function addClub(name: string): Club {
	tournamentState.update(state => {
		const club: Club = {
			id: createUUID(),
			name: name.trim(),
			createdAt: nowISO(),
			updatedAt: nowISO()
		};
		
		return {
			...state,
			clubs: [...state.clubs, club],
			updatedAt: nowISO()
		};
	});
	
	return tournamentState.get().clubs[tournamentState.get().clubs.length - 1];
}

/**
 * Aktualisiert einen Verein
 */
export function updateClub(clubId: UUID, newName: string): boolean {
	let updated = false;
	
	tournamentState.update(state => {
		const clubIndex = state.clubs.findIndex(c => c.id === clubId);
		if (clubIndex !== -1) {
			const club = state.clubs[clubIndex];
			if (club.name !== newName.trim()) {
				const newClubs = [...state.clubs];
				newClubs[clubIndex] = {
					...club,
					name: newName.trim(),
					updatedAt: nowISO()
				};
				
				// Aktualisiere alle Teams dieses Vereins
				const newTeams = state.teams.map(team => {
					if (team.clubId === clubId) {
						return {
							...team,
							updatedAt: nowISO()
						};
					}
					return team;
				});
				
				return {
					...state,
					clubs: newClubs,
					teams: newTeams,
					updatedAt: nowISO()
				};
			}
		}
		return state;
	});
	
	return updated;
}

/**
 * Löscht einen Verein und alle seine Teams
 */
export function deleteClub(clubId: UUID): boolean {
	let deleted = false;
	
	tournamentState.update(state => {
		const clubIndex = state.clubs.findIndex(c => c.id === clubId);
		if (clubIndex !== -1) {
			// Filtere Vereine
			const newClubs = state.clubs.filter(c => c.id !== clubId);
			
			// Filtere Teams dieses Vereins
			const newTeams = state.teams.filter(team => team.clubId !== clubId);
			
			// Filtere Spiele, die Teams dieses Vereins beinhalten
			let newSchedule: Schedule | null = state.schedule;
			if (state.schedule) {
				newSchedule = {
					...state.schedule,
					matches: state.schedule.matches.filter(match => {
						return match.teamAId !== clubId && match.teamBId !== clubId;
					})
				};
				
				// Wenn keine Spiele mehr übrig, lösche den Spielplan
				if (newSchedule.matches.length === 0) {
					newSchedule = null;
				}
			}
			
			return {
				...state,
				clubs: newClubs,
				teams: newTeams,
				schedule: newSchedule,
				updatedAt: nowISO()
			};
		}
		return state;
	});
	
	return deleted;
}

// ============================================================================
// AKTIONEN - TEAMS
// ============================================================================

/**
 * Fügt ein neues Team zu einem Verein hinzu
 */
export function addTeam(clubId: UUID): Team | null {
	let newTeam: Team | null = null;
	
	tournamentState.update(state => {
		const club = state.clubs.find(c => c.id === clubId);
		if (!club) {
			return state;
		}
		
		// Berechne nächste römische Nummer
		const clubTeams = state.teams.filter(t => t.clubId === clubId);
		const nextNumber = clubTeams.length + 1;
		const romanNumber = toRoman(nextNumber);
		
		newTeam = {
			id: createUUID(),
			clubId,
			romanNumber,
			name: `${club.name} ${romanNumber}`,
			createdAt: nowISO(),
			updatedAt: nowISO()
		};
		
		return {
			...state,
			teams: [...state.teams, newTeam],
			updatedAt: nowISO()
		};
	});
	
	return newTeam;
}

/**
 * Aktualisiert ein Team
 */
export function updateTeam(teamId: UUID, newName: string): boolean {
	let updated = false;
	
	tournamentState.update(state => {
		const teamIndex = state.teams.findIndex(t => t.id === teamId);
		if (teamIndex !== -1) {
			const team = state.teams[teamIndex];
			if (team.name !== newName.trim()) {
				const newTeams = [...state.teams];
				newTeams[teamIndex] = {
					...team,
					name: newName.trim(),
					updatedAt: nowISO()
				};
				
				return {
					...state,
					teams: newTeams,
					updatedAt: nowISO()
				};
			}
		}
		return state;
	});
	
	return updated;
}

/**
 * Löscht ein Team
 */
export function deleteTeam(teamId: UUID): boolean {
	let deleted = false;
	
	tournamentState.update(state => {
		const teamIndex = state.teams.findIndex(t => t.id === teamId);
		if (teamIndex !== -1) {
			const newTeams = state.teams.filter(t => t.id !== teamId);
			
			// Filtere Spiele, die dieses Team beinhalten
			let newSchedule: Schedule | null = state.schedule;
			if (state.schedule) {
				newSchedule = {
					...state.schedule,
					matches: state.schedule.matches.filter(match => {
						return match.teamAId !== teamId && match.teamBId !== teamId;
					})
				};
				
				// Wenn keine Spiele mehr übrig, lösche den Spielplan
				if (newSchedule.matches.length === 0) {
					newSchedule = null;
				}
			}
			
			// Renumiere Teams desselben Vereins
			const team = state.teams[teamIndex];
			const clubTeams = newTeams.filter(t => t.clubId === team.clubId);
			const renamedTeams = newTeams.map(t => {
				if (t.clubId === team.clubId) {
					const teamIndexInClub = clubTeams.findIndex(ct => ct.id === t.id);
					const newNumber = teamIndexInClub + 1;
					const romanNumber = toRoman(newNumber);
					return {
						...t,
						romanNumber,
						name: `${state.clubs.find(c => c.id === t.clubId)?.name || 'Verein'} ${romanNumber}`,
						updatedAt: nowISO()
					};
				}
				return t;
			});
			
			return {
				...state,
				teams: renamedTeams,
				schedule: newSchedule,
				updatedAt: nowISO()
			};
		}
		return state;
	});
	
	return deleted;
}

/**
 * Konvertiert Nummer zu römischer Ziffer (für Team-Namen)
 */
function toRoman(num: number): string {
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

// ============================================================================
// AKTIONEN - SPIELFELDER
// ============================================================================

/**
 * Fügt ein neues Spielfeld hinzu
 */
export function addField(name: string, type: string, customType?: string): Field {
	let newField: Field | null = null;
	
	tournamentState.update(state => {
		newField = {
			id: createUUID(),
			name: name.trim(),
			type: type as any,
			customType: type === 'custom' ? customType?.trim() : undefined,
			createdAt: nowISO(),
			updatedAt: nowISO()
		};
		
		return {
			...state,
			fields: [...state.fields, newField],
			updatedAt: nowISO()
		};
	});
	
	return newField!;
}

/**
 * Aktualisiert ein Spielfeld
 */
export function updateField(fieldId: UUID, newName: string, newType: string, customType?: string): boolean {
	let updated = false;
	
	tournamentState.update(state => {
		const fieldIndex = state.fields.findIndex(f => f.id === fieldId);
		if (fieldIndex !== -1) {
			const field = state.fields[fieldIndex];
			if (field.name !== newName.trim() || field.type !== newType || field.customType !== customType) {
				const newFields = [...state.fields];
				newFields[fieldIndex] = {
					...field,
					name: newName.trim(),
					type: newType as any,
					customType: newType === 'custom' ? customType?.trim() : undefined,
					updatedAt: nowISO()
				};
				
				return {
					...state,
					fields: newFields,
					config: {
						...state.config,
						fields: newFields,
						updatedAt: nowISO()
					},
					updatedAt: nowISO()
				};
			}
		}
		return state;
	});
	
	return updated;
}

/**
 * Löscht ein Spielfeld
 */
export function deleteField(fieldId: UUID): boolean {
	let deleted = false;
	
	tournamentState.update(state => {
		const fieldIndex = state.fields.findIndex(f => f.id === fieldId);
		if (fieldIndex !== -1) {
			const newFields = state.fields.filter(f => f.id !== fieldId);
			
			// Filtere Spiele auf diesem Feld
			let newSchedule: Schedule | null = state.schedule;
			if (state.schedule) {
				newSchedule = {
					...state.schedule,
					matches: state.schedule.matches.filter(match => match.fieldId !== fieldId)
				};
				
				// Wenn keine Spiele mehr übrig, lösche den Spielplan
				if (newSchedule.matches.length === 0) {
					newSchedule = null;
				}
			}
			
			return {
				...state,
				fields: newFields,
				config: {
					...state.config,
					fields: newFields,
					updatedAt: nowISO()
				},
				schedule: newSchedule,
				updatedAt: nowISO()
			};
		}
		return state;
	});
	
	return deleted;
}

// ============================================================================
// AKTIONEN - KONFIGURATION
// ============================================================================

/**
 * Aktualisiert die Turnier-Konfiguration
 */
export function updateConfig(partialConfig: Partial<TournamentConfig>): void {
	tournamentState.update(state => {
		return {
			...state,
			config: {
				...state.config,
				...partialConfig,
				updatedAt: nowISO()
			},
			updatedAt: nowISO()
		};
	});
}

/**
 * Setzt die Startzeit
 */
export function setStartDateTime(date: Date): void {
	tournamentState.update(state => {
		return {
			...state,
			config: {
				...state.config,
				startDateTime: date.toISOString(),
				updatedAt: nowISO()
			},
			updatedAt: nowISO()
		};
	});
}

/**
 * Setzt den Turniernamen
 */
export function setTournamentName(name: string): void {
	tournamentState.update(state => {
		return {
			...state,
			config: {
				...state.config,
				name: name.trim(),
				updatedAt: nowISO()
			},
			updatedAt: nowISO()
		};
	});
}

// ============================================================================
// AKTIONEN - SPIELPLAN
// ============================================================================

/**
 * Setzt einen neuen Spielplan
 */
export function setSchedule(schedule: Schedule | null): void {
	tournamentState.update(state => {
		return {
			...state,
			schedule,
			uiState: {
				...state.uiState,
				lastCalculationTime: schedule ? nowISO() : null
			},
			updatedAt: nowISO()
		};
	});
}

/**
 * Löscht den aktuellen Spielplan
 */
export function clearSchedule(): void {
	setSchedule(null);
}

// ============================================================================
// AKTIONEN - UI STATE
// ============================================================================

/**
 * Setzt den aktuellen Schritt im geführten Flow
 */
export function setCurrentStep(step: number): void {
	tournamentState.update(state => {
		return {
			...state,
			uiState: {
				...state.uiState,
				currentStep: step
			}
		};
	});
}

/**
 * Toggle für die Einstellungen-Sektion
 */
export function toggleSettingsExpanded(expanded?: boolean): void {
	tournamentState.update(state => {
		return {
			...state,
			uiState: {
				...state.uiState,
				isSettingsExpanded: expanded !== undefined ? expanded : !state.uiState?.isSettingsExpanded
			}
		};
	});
}

// ============================================================================
// STORE EXPORT
// ============================================================================

/**
 * Setzt den kompletten Turnier-Zustand (z.B. beim Laden aus dem Speicher)
 */
export function setTournamentState(newState: TournamentState): void {
	tournamentState.set(newState);
}

/**
 * Gibt den aktuellen Turnier-Zustand zurück
 */
export function getTournamentState(): TournamentState {
	return tournamentState.get();
}

/**
 * Subscribt an den Turnier-Zustand
 */
export function subscribeToTournamentState(callback: (state: TournamentState) => void): () => void {
	return tournamentState.subscribe(callback);
}

/**
 * Zurücksetzen auf den initialen Zustand
 */
export function resetTournamentState(): void {
	tournamentState.set(createInitialState());
}

// Export des Haupt-Stores für direkte Nutzung
export { tournamentState };
