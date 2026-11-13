/**
 * Validierungsfunktionen für die Datenmodelle
 */

import type {
	Club,
	Team,
	Field,
	TournamentConfig,
	Match,
	Schedule,
	TournamentState
} from './types';

// ============================================================================
// VALIDIERUNGSFEHLER
// ============================================================================

/** Validierungsfehler */
export interface ValidationError {
	field: string;
	message: string;
	severity: 'error' | 'warning';
}

/** Validierungsergebnis */
export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
}

// ============================================================================
// VALIDIERUNGSFUNKTIONEN
// ============================================================================

/** Validiert einen Verein */
export function validateClub(club: Club): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	if (!club.name || club.name.trim().length === 0) {
		errors.push({
			field: 'name',
			message: 'Vereinsname darf nicht leer sein',
			severity: 'error'
		});
	}

	if (club.name.length > 100) {
		warnings.push({
			field: 'name',
			message: 'Vereinsname ist sehr lang (max. 100 Zeichen empfohlen)',
			severity: 'warning'
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/** Validiert ein Team */
export function validateTeam(team: Team, clubs: Club[]): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	// Prüfe, ob Verein existiert
	const clubExists = clubs.some(c => c.id === team.clubId);
	if (!clubExists) {
		errors.push({
			field: 'clubId',
			message: 'Verein nicht gefunden',
			severity: 'error'
		});
	}

	if (!team.romanNumber || team.romanNumber.length === 0) {
		errors.push({
			field: 'romanNumber',
			message: 'Römische Nummer fehlt',
			severity: 'error'
		});
	}

	if (!team.name || team.name.trim().length === 0) {
		errors.push({
			field: 'name',
			message: 'Teamname darf nicht leer sein',
			severity: 'error'
		});
	}

	if (team.name.length > 100) {
		warnings.push({
			field: 'name',
			message: 'Teamname ist sehr lang (max. 100 Zeichen empfohlen)',
			severity: 'warning'
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/** Validiert ein Spielfeld */
export function validateField(field: Field): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	if (!field.name || field.name.trim().length === 0) {
		errors.push({
			field: 'name',
			message: 'Feldname darf nicht leer sein',
			severity: 'error'
		});
	}

	if (field.name.length > 100) {
		warnings.push({
			field: 'name',
			message: 'Feldname ist sehr lang (max. 100 Zeichen empfohlen)',
			severity: 'warning'
		});
	}

	if (field.type === 'custom' && (!field.customType || field.customType.trim().length === 0)) {
		errors.push({
			field: 'customType',
			message: 'Benutzerdefinierter Feldtyp muss angegeben werden',
			severity: 'error'
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/** Validiert die Turnier-Konfiguration */
export function validateTournamentConfig(config: TournamentConfig): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	if (config.rounds < 1) {
		errors.push({
			field: 'rounds',
			message: 'Anzahl der Runden muss mindestens 1 sein',
			severity: 'error'
		});
	}

	if (config.rounds > 20) {
		warnings.push({
			field: 'rounds',
			message: 'Sehr viele Runden (20+ können die Performance beeinträchtigen)',
			severity: 'warning'
		});
	}

	if (config.matchDuration < 1) {
		errors.push({
			field: 'matchDuration',
			message: 'Spieldauer muss mindestens 1 Minute betragen',
			severity: 'error'
		});
	}

	if (config.matchDuration > 120) {
		warnings.push({
			field: 'matchDuration',
			message: 'Sehr lange Spieldauer (120+ Minuten sind ungewöhnlich für F-Jugend)',
			severity: 'warning'
		});
	}

	if (config.breakDuration < 0) {
		errors.push({
			field: 'breakDuration',
			message: 'Pausendauer kann nicht negativ sein',
			severity: 'error'
		});
	}

	if (config.breakDuration > 30) {
		warnings.push({
			field: 'breakDuration',
			message: 'Sehr lange Pausen (30+ Minuten sind ungewöhnlich)',
			severity: 'warning'
		});
	}

	if (config.fields.length === 0) {
		warnings.push({
			field: 'fields',
			message: 'Keine Spielfelder konfiguriert - Spielplan kann nicht generiert werden',
			severity: 'warning'
		});
	}

	// Prüfe Startdatum
	try {
		const startDate = new Date(config.startDateTime);
		if (isNaN(startDate.getTime())) {
			errors.push({
				field: 'startDateTime',
				message: 'Ungültiges Startdatum',
				severity: 'error'
			});
		}
	} catch {
		errors.push({
			field: 'startDateTime',
			message: 'Ungültiges Startdatum-Format',
			severity: 'error'
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/** Validiert einen Spielplan */
export function validateSchedule(schedule: Schedule, config: TournamentConfig, teams: Team[]): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	if (schedule.matches.length === 0) {
		warnings.push({
			field: 'matches',
			message: 'Keine Spiele im Spielplan - prüfe Konfiguration und Teams',
			severity: 'warning'
		});
	}

	// Prüfe auf Überschneidungen pro Team
	const teamMatches: Record<string, Match[]> = {};
	for (const match of schedule.matches) {
		if (!teamMatches[match.teamAId]) {
			teamMatches[match.teamAId] = [];
		}
		if (!teamMatches[match.teamBId]) {
			teamMatches[match.teamBId] = [];
		}
		teamMatches[match.teamAId].push(match);
		teamMatches[match.teamBId].push(match);
	}

	// Prüfe Zeitüberschneidungen für jedes Team
	for (const [teamId, matches] of Object.entries(teamMatches)) {
		const sortedMatches = [...matches].sort((a, b) => 
			new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
		);
		
		for (let i = 0; i < sortedMatches.length - 1; i++) {
			const current = sortedMatches[i];
			const next = sortedMatches[i + 1];
			
			const currentEnd = new Date(current.endTime).getTime();
			const nextStart = new Date(next.startTime).getTime();
			
			if (currentEnd > nextStart) {
				errors.push({
					field: `matches[${current.id}]`,
					message: `Team ${teamId} hat Zeitüberschneidung zwischen Spiel ${current.id} und ${next.id}`,
					severity: 'error'
				});
			}
		}
	}

	// Prüfe Feld-Überschneidungen
	const fieldMatches: Record<string, Match[]> = {};
	for (const match of schedule.matches) {
		if (!fieldMatches[match.fieldId]) {
			fieldMatches[match.fieldId] = [];
		}
		fieldMatches[match.fieldId].push(match);
	}

	for (const [fieldId, matches] of Object.entries(fieldMatches)) {
		const sortedMatches = [...matches].sort((a, b) => 
			new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
		);
		
		for (let i = 0; i < sortedMatches.length - 1; i++) {
			const current = sortedMatches[i];
			const next = sortedMatches[i + 1];
			
			const currentEnd = new Date(current.endTime).getTime();
			const nextStart = new Date(next.startTime).getTime();
			
			if (currentEnd > nextStart) {
				errors.push({
					field: `matches[${current.id}]`,
					message: `Feld ${fieldId} hat Zeitüberschneidung zwischen Spiel ${current.id} und ${next.id}`,
					severity: 'error'
				});
			}
		}
	}

	// Prüfe Statistiken
	if (schedule.statistics.minMatchesPerTeam < 1 && teams.length > 0) {
		warnings.push({
			field: 'statistics',
			message: 'Einige Teams haben keine Spiele - prüfe Konfiguration',
			severity: 'warning'
		});
	}

	if (schedule.statistics.derbyCount > 0) {
		warnings.push({
			field: 'statistics',
			message: `${schedule.statistics.derbyCount} Vereins-Duelle (Derbys) im Spielplan`,
			severity: 'warning'
		});
	}

	if (schedule.statistics.repeatCount > 0) {
		warnings.push({
			field: 'statistics',
			message: `${schedule.statistics.repeatCount} Doppelbegegnungen im Spielplan`,
			severity: 'warning'
		});
	}

	if (schedule.statistics.maxMatchesPerTeam - schedule.statistics.minMatchesPerTeam > 1) {
		warnings.push({
			field: 'statistics',
			message: `Ungleiche Spielverteilung: ${schedule.statistics.minMatchesPerTeam}-${schedule.statistics.maxMatchesPerTeam} Spiele pro Team`,
			severity: 'warning'
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/** Validiert den kompletten Turnier-Zustand */
export function validateTournamentState(state: TournamentState): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	// Validiert Vereine
	for (const club of state.clubs) {
		const result = validateClub(club);
		errors.push(...result.errors);
		warnings.push(...result.warnings);
	}

	// Validiert Teams
	for (const team of state.teams) {
		const result = validateTeam(team, state.clubs);
		errors.push(...result.errors);
		warnings.push(...result.warnings);
	}

	// Validiert Spielfelder
	for (const field of state.fields) {
		const result = validateField(field);
		errors.push(...result.errors);
		warnings.push(...result.warnings);
	}

	// Validiert Konfiguration
	const configResult = validateTournamentConfig(state.config);
	errors.push(...configResult.errors);
	warnings.push(...configResult.warnings);

	// Validiert Spielplan (falls vorhanden)
	if (state.schedule) {
		const scheduleResult = validateSchedule(state.schedule, state.config, state.teams);
		errors.push(...scheduleResult.errors);
		warnings.push(...scheduleResult.warnings);
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

// ============================================================================
// HELFERFUNKTIONEN
// ============================================================================

/** Gibt alle Fehler als formatierte Liste zurück */
export function formatValidationErrors(result: ValidationResult): string[] {
	return [
		...result.errors.map(e => `[FEHLER] ${e.field}: ${e.message}`),
		...result.warnings.map(w => `[WARNUNG] ${w.field}: ${w.message}`)
	];
}

/** Prüft, ob ein Turnier generiert werden kann */
export function canGenerateSchedule(state: TournamentState): { canGenerate: boolean; message: string } {
	const result = validateTournamentState(state);
	
	if (!result.valid) {
		return {
			canGenerate: false,
			message: `Fehler in den Daten: ${result.errors.map(e => e.message).join(', ')}`
		};
	}

	if (state.teams.length < 2) {
		return {
			canGenerate: false,
			message: 'Mindestens 2 Teams werden für einen Spielplan benötigt'
		};
	}

	if (state.config.fields.length === 0) {
		return {
			canGenerate: false,
			message: 'Mindestens 1 Spielfeld wird für einen Spielplan benötigt'
		};
	}

	return { canGenerate: true, message: '' };
}
