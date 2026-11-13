/**
 * Spielplan-Algorithmus für den Kinderfestival Turnierplaner
 * 
 * Dieser Algorithmus generiert einen optimalen Spielplan für F-Jugend-Turniere
 * mit folgenden Zielen:
 * 1. Keine Vereins-Duelle (Derbys) - Teams desselben Vereins spielen nicht gegeneinander
 * 2. Keine Doppelbegegnungen - Jedes Team Paaring nur einmal
 * 3. Gleichmäßige Spielverteilung - Alle Teams haben ähnlich viele Spiele
 * 4. Keine Zeitüberschneidungen - Pro Team und pro Feld keine Überschneidungen
 */

import type {
	UUID,
	Team,
	Field,
	TournamentConfig,
	Match,
	Schedule,
	ConflictInfo
} from '../models/types';
import { createUUID, nowISO } from '../models/types';

// ============================================================================
// ALGORITHMUS OPTIONEN
// ============================================================================

/** Optionen für den Algorithmus */
export interface SchedulingOptions {
	/** Maximale Versuche, einen gültigen Spielplan zu generieren */
	maxAttempts: number;
	/** Maximale Iterationen pro Versuch */
	maxIterations: number;
	/** Gewichtung für Derby-Vermeidung */
	derbyPenalty: number;
	/** Gewichtung für Wiederholungs-Vermeidung */
	repeatPenalty: number;
	/** Gewichtung für gleichmäßige Verteilung */
	balancePenalty: number;
}

/** Default Optionen */
export const DEFAULT_SCHEDULING_OPTIONS: SchedulingOptions = {
	maxAttempts: 100,
	maxIterations: 1000,
	derbyPenalty: 100,
	repeatPenalty: 50,
	balancePenalty: 10
};

// ============================================================================
// ALGORITHMUS IMPLEMENTIERUNG
// ============================================================================

/**
 * Generiert einen Spielplan für die gegebene Konfiguration und Teams
 * 
 * @param config - Turnier-Konfiguration
 * @param teams - Liste aller Teams
 * @param fields - Liste aller Spielfelder
 * @param options - Algorithmus-Optionen (optional)
 * @returns Spielplan oder null, wenn kein gültiger Plan generiert werden kann
 */
export function generateSchedule(
	config: TournamentConfig,
	teams: Team[],
	fields: Field[],
	options: Partial<SchedulingOptions> = {}
): Schedule | null {
	const opts: SchedulingOptions = { ...DEFAULT_SCHEDULING_OPTIONS, ...options };
	
	if (teams.length < 2) {
		return null;
	}
	
	if (fields.length === 0) {
		return null;
	}

	// Berechne Startzeit
	const startDate = new Date(config.startDateTime);
	const matchDurationMs = config.matchDuration * 60 * 1000;
	const breakDurationMs = config.breakDuration * 60 * 1000;
	const slotDurationMs = matchDurationMs + breakDurationMs;

	// Erstelle Team-Gruppen nach Verein
	const teamsByClub: Record<UUID, Team[]> = {};
	for (const team of teams) {
		if (!teamsByClub[team.clubId]) {
			teamsByClub[team.clubId] = [];
		}
		teamsByClub[team.clubId].push(team);
	}

	// Erstelle eine Liste aller möglichen Paarungen
	const allPossiblePairs: [Team, Team][] = [];
	for (let i = 0; i < teams.length; i++) {
		for (let j = i + 1; j < teams.length; j++) {
			allPossiblePairs.push([teams[i], teams[j]]);
		}
	}

	// Filtere ungültige Paarungen ( Teams desselben Vereins)
	const validPairs: [Team, Team][] = [];
	const derbyPairs: [Team, Team][] = [];
	
	for (const [teamA, teamB] of allPossiblePairs) {
		if (teamA.clubId === teamB.clubId) {
			derbyPairs.push([teamA, teamB]);
		} else {
			validPairs.push([teamA, teamB]);
		}
	}

	// Wenn zu wenige gültige Paarungen, müssen wir Derbys einbeziehen
	const needDerbys = validPairs.length < config.rounds * Math.floor(teams.length / 2);

	// Kombiniere gültige Paarungen mit Derbys (falls nötig)
	const candidatePairs: [Team, Team][] = [...validPairs];
	if (needDerbys) {
		candidatePairs.push(...derbyPairs);
	}

	// Berechne, wie viele Spiele pro Runde möglich sind
	const maxMatchesPerRound = Math.min(
		Math.floor(teams.length / 2),
		fields.length
	);

	// Ziel: So viele Runden wie möglich füllen
	const totalTargetMatches = maxMatchesPerRound * config.rounds;
	const actualTotalMatches = Math.min(
		candidatePairs.length,
		totalTargetMatches
	);

	// Versuche, einen guten Spielplan zu generieren
	let bestSchedule: Match[] | null = null;
	let bestScore = -Infinity;

	for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
		const schedule = tryGenerateSchedule(
			config,
			teams,
			fields,
			candidatePairs,
			maxMatchesPerRound,
			startDate,
			slotDurationMs,
			matchDurationMs,
			breakDurationMs,
			opts
		);

		if (schedule) {
			const score = calculateScheduleScore(schedule, teams, opts);
			if (score > bestScore) {
				bestScore = score;
				bestSchedule = schedule;
			}
		}
	}

	if (!bestSchedule) {
		return null;
	}

	// Erstelle Spielplan-Objekt
	return createScheduleObject(
		config.id,
		bestSchedule,
		teams
	);
}

/**
 * Versucht, einen Spielplan zu generieren (ein Versuch)
 */
function tryGenerateSchedule(
	config: TournamentConfig,
	teams: Team[],
	fields: Field[],
	candidatePairs: [Team, Team][],
	maxMatchesPerRound: number,
	startDate: Date,
	slotDurationMs: number,
	matchDurationMs: number,
	breakDurationMs: number,
	options: SchedulingOptions
): Match[] | null {
	const matches: Match[] = [];
	const usedPairs = new Set<string>();
	const teamMatchCount: Record<UUID, number> = {};
	
	// Initialisiere Zähler
	for (const team of teams) {
		teamMatchCount[team.id] = 0;
	}

	// Erstelle eine Kopie der Kandidaten-Paarungen und mische sie
	const shuffledPairs = [...candidatePairs];
	// Fisher-Yates Shuffle
	for (let i = shuffledPairs.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffledPairs[i], shuffledPairs[j]] = [shuffledPairs[j], shuffledPairs[i]];
	}

	// Generiere Runden
	for (let round = 1; round <= config.rounds; round++) {
		const roundMatches: Match[] = [];
		const usedTeamsInRound = new Set<UUID>();
		const usedFieldsInRound = new Set<UUID>();

		// Filtere verfügbare Paarungen für diese Runde
		const availablePairs = shuffledPairs.filter(([teamA, teamB]) => {
			// Prüfe, ob Teams bereits in dieser Runde spielen
			if (usedTeamsInRound.has(teamA.id) || usedTeamsInRound.has(teamB.id)) {
				return false;
			}

			// Prüfe, ob Paarung bereits verwendet wurde
			const pairKey = `${teamA.id}-${teamB.id}`;
			const reversePairKey = `${teamB.id}-${teamA.id}`;
			if (usedPairs.has(pairKey) || usedPairs.has(reversePairKey)) {
				return false;
			}

			return true;
		});

		// Sortiere nach Priorität (bevorzuge Teams mit weniger Spielen)
		availablePairs.sort((a, b) => {
			const aTotal = teamMatchCount[a[0].id] + teamMatchCount[a[1].id];
			const bTotal = teamMatchCount[b[0].id] + teamMatchCount[b[1].id];
			return aTotal - bTotal;
		});

		// Wähle die besten Paarungen für diese Runde
		const selectedPairs = availablePairs.slice(0, maxMatchesPerRound);

		// Verteile auf Felder und Zeitslots
		for (let i = 0; i < selectedPairs.length && i < fields.length; i++) {
			const [teamA, teamB] = selectedPairs[i];
			const field = fields[i % fields.length];

			// Berechne Startzeit für dieses Spiel
			const slotIndex = round - 1;
			const startTime = new Date(startDate.getTime() + slotIndex * slotDurationMs);
			const endTime = new Date(startTime.getTime() + matchDurationMs);

			// Prüfe Zeitüberschneidungen mit bestehenden Spielen
			const hasTimeConflict = matches.some(existing => {
				if (existing.teamAId === teamA.id || existing.teamAId === teamB.id ||
					existing.teamBId === teamA.id || existing.teamBId === teamB.id) {
					const existingStart = new Date(existing.startTime).getTime();
					const existingEnd = new Date(existing.endTime).getTime();
					const newStart = startTime.getTime();
					const newEnd = endTime.getTime();
					
					// Überschneidung wenn: [newStart, newEnd] überlappt mit [existingStart, existingEnd]
					return newStart < existingEnd && newEnd > existingStart;
				}
				return false;
			});

			if (hasTimeConflict) {
				// Versuche, einen anderen Slot zu finden
				let foundSlot = false;
				for (let slotOffset = 0; slotOffset < fields.length; slotOffset++) {
					const alternativeFieldIndex = (i + slotOffset) % fields.length;
					const alternativeField = fields[alternativeFieldIndex];
					
					if (usedFieldsInRound.has(alternativeField.id)) {
						continue;
					}

					const altStartTime = new Date(
						startDate.getTime() + 
						slotIndex * slotDurationMs + 
						slotOffset * slotDurationMs
					);
					const altEndTime = new Date(altStartTime.getTime() + matchDurationMs);

					const altHasConflict = matches.some(existing => {
						if (existing.teamAId === teamA.id || existing.teamAId === teamB.id ||
							existing.teamBId === teamA.id || existing.teamBId === teamB.id) {
							const existingStart = new Date(existing.startTime).getTime();
							const existingEnd = new Date(existing.endTime).getTime();
							const newStart = altStartTime.getTime();
							const newEnd = altEndTime.getTime();
							return newStart < existingEnd && newEnd > existingStart;
						}
						return false;
					});

					if (!altHasConflict) {
						const match: Match = {
							id: createUUID(),
							round,
							fieldId: alternativeField.id,
							startTime: altStartTime.toISOString(),
							endTime: altEndTime.toISOString(),
							teamAId: teamA.id,
							teamBId: teamB.id,
							result: null,
							isDerby: teamA.clubId === teamB.clubId,
							isRepeat: false,
							conflicts: [],
							createdAt: nowISO(),
							updatedAt: nowISO()
						};

						roundMatches.push(match);
						usedTeamsInRound.add(teamA.id);
						usedTeamsInRound.add(teamB.id);
						usedFieldsInRound.add(alternativeField.id);
						usedPairs.add(`${teamA.id}-${teamB.id}`);
						teamMatchCount[teamA.id]++;
						teamMatchCount[teamB.id]++;
						foundSlot = true;
						break;
					}
				}
				
				if (!foundSlot) {
					// Überspringe diese Paarung
					continue;
				}
			} else {
				const match: Match = {
					id: createUUID(),
					round,
					fieldId: field.id,
					startTime: startTime.toISOString(),
					endTime: endTime.toISOString(),
					teamAId: teamA.id,
					teamBId: teamB.id,
					result: null,
					isDerby: teamA.clubId === teamB.clubId,
					isRepeat: false,
					conflicts: [],
					createdAt: nowISO(),
					updatedAt: nowISO()
				};

				roundMatches.push(match);
				usedTeamsInRound.add(teamA.id);
				usedTeamsInRound.add(teamB.id);
				usedFieldsInRound.add(field.id);
				usedPairs.add(`${teamA.id}-${teamB.id}`);
				teamMatchCount[teamA.id]++;
				teamMatchCount[teamB.id]++;
			}
		}

		matches.push(...roundMatches);
	}

	return matches.length > 0 ? matches : null;
}

/**
 * Berechnet den Score für einen Spielplan (je höher, desto besser)
 */
function calculateScheduleScore(
	matches: Match[],
	teams: Team[],
	options: SchedulingOptions
): number {
	let score = 0;

	// Penalty für Derbys
	const derbyCount = matches.filter(m => m.isDerby).length;
	score -= derbyCount * options.derbyPenalty;

	// Penalty für Wiederholungen (sollte eigentlich nicht vorkommen)
	const pairCounts: Record<string, number> = {};
	for (const match of matches) {
		const pairKey = `${match.teamAId}-${match.teamBId}`;
		pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
	}
	const repeatCount = Object.values(pairCounts).filter(c => c > 1).length;
	score -= repeatCount * options.repeatPenalty;

	// Bonus für gleichmäßige Verteilung
	const teamMatchCounts: Record<string, number> = {};
	for (const team of teams) {
		teamMatchCounts[team.id] = 0;
	}
	for (const match of matches) {
		teamMatchCounts[match.teamAId]++;
		teamMatchCounts[match.teamBId]++;
	}

	const counts = Object.values(teamMatchCounts);
	const minCount = Math.min(...counts);
	const maxCount = Math.max(...counts);
	const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;

	// Penalty für Ungleichheit
	score -= (maxCount - minCount) * options.balancePenalty;

	// Bonus für viele Spiele
	score += matches.length * 10;

	// Bonus für hohe Mindestanzahl von Spielen pro Team
	score += minCount * 5;

	return score;
}

/**
 * Erstellt ein Spielplan-Objekt mit Statistiken und Konfliktanalyse
 */
function createScheduleObject(
	configId: UUID,
	matches: Match[],
	teams: Team[]
): Schedule {
	// Markiere Wiederholungen
	const pairCounts: Record<string, number> = {};
	for (const match of matches) {
		const pairKey = `${match.teamAId}-${match.teamB.id}`;
		const reverseKey = `${match.teamBId}-${match.teamAId}`;
		const count = (pairCounts[pairKey] || 0) + (pairCounts[reverseKey] || 0) + 1;
		pairCounts[pairKey] = count;
		pairCounts[reverseKey] = count;
		
		if (count > 1) {
			match.isRepeat = true;
			match.conflicts.push({
				type: 'repeat',
				message: 'Doppelbegegnung',
				severity: 'warning'
			});
		}
	}

	// Füge Derby-Konflikte hinzu
	for (const match of matches) {
		if (match.isDerby) {
			match.conflicts.push({
				type: 'derby',
				message: 'Vereins-Duell (Derby)',
				severity: 'warning'
			});
		}
	}

	// Berechne Statistiken
	const teamMatchCounts: Record<UUID, number> = {};
	for (const team of teams) {
		teamMatchCounts[team.id] = 0;
	}
	for (const match of matches) {
		teamMatchCounts[match.teamAId]++;
		teamMatchCounts[match.teamBId]++;
	}

	const matchCounts = Object.values(teamMatchCounts);
	const minMatches = Math.min(...matchCounts);
	const maxMatches = Math.max(...matchCounts);
	const avgMatches = matchCounts.reduce((a, b) => a + b, 0) / matchCounts.length;

	const derbyCount = matches.filter(m => m.isDerby).length;
	const repeatCount = matches.filter(m => m.isRepeat).length;

	// Aggregiere Konflikte
	const allConflicts: ConflictInfo[] = [];
	const conflictTypes: Record<string, { count: number; message: string; severity: 'warning' | 'error' }> = {};
	
	for (const match of matches) {
		for (const conflict of match.conflicts) {
			const key = `${conflict.type}-${conflict.severity}`;
			if (!conflictTypes[key]) {
				conflictTypes[key] = {
					count: 0,
					message: conflict.message,
					severity: conflict.severity
				};
			}
			conflictTypes[key].count++;
		}
	}

	for (const [key, info] of Object.entries(conflictTypes)) {
		allConflicts.push({
			type: key.split('-')[0] as any,
			message: `${info.message} (${info.count}x)`,
			severity: info.severity
		});
	}

	return {
		id: createUUID(),
		tournamentConfigId: configId,
		matches,
		statistics: {
			totalMatches: matches.length,
			matchesPerTeam: teamMatchCounts,
			derbyCount,
			repeatCount,
			minMatchesPerTeam: minMatches,
			maxMatchesPerTeam: maxMatches,
			avgMatchesPerTeam: Number(avgMatches.toFixed(2)),
			conflictSummary: allConflicts
		},
		generatedAt: nowISO(),
		updatedAt: nowISO()
	};
}

// ============================================================================
// ALTERNATIVER ALGORITHMUS (Round-Robin Variante)
// ============================================================================

/**
 * Round-Robin Algorithmus - Jedes Team spielt gegen jedes andere Team einmal
 * 
 * Hinweis: Bei vielen Teams wird dies sehr viele Runden erfordern.
 * Für F-Jugend-Turniere mit begrenzter Zeit ist der obige Algorithmus besser.
 */
export function generateRoundRobinSchedule(
	teams: Team[],
	fields: Field[],
	config: TournamentConfig
): Schedule | null {
	if (teams.length < 2) return null;
	if (fields.length === 0) return null;

	const startDate = new Date(config.startDateTime);
	const matchDurationMs = config.matchDuration * 60 * 1000;
	const breakDurationMs = config.breakDuration * 60 * 1000;
	const slotDurationMs = matchDurationMs + breakDurationMs;

	// Round-Robin: Jedes Team spielt gegen jedes andere
	const allPairs: [Team, Team][] = [];
	for (let i = 0; i < teams.length; i++) {
		for (let j = i + 1; j < teams.length; j++) {
			// Überspringe Paarungen desselben Vereins (falls gewünscht)
			// In Round-Robin können wir Derbys nicht vermeiden
			allPairs.push([teams[i], teams[j]]);
		}
	}

	const matches: Match[] = [];
	let round = 1;
	let fieldIndex = 0;

	for (const [teamA, teamB] of allPairs) {
		const field = fields[fieldIndex % fields.length];
		fieldIndex++;

		// Berechne Startzeit
		const matchIndex = matches.length;
		const roundIndex = Math.floor(matchIndex / fields.length);
		const startTime = new Date(startDate.getTime() + roundIndex * slotDurationMs);
		const endTime = new Date(startTime.getTime() + matchDurationMs);

		// Prüfe, ob wir eine neue Runde benötigen
		if (fieldIndex % fields.length === 0) {
			round++;
		}

		const match: Match = {
			id: createUUID(),
			round,
			fieldId: field.id,
			startTime: startTime.toISOString(),
			endTime: endTime.toISOString(),
			teamAId: teamA.id,
			teamBId: teamB.id,
			result: null,
			isDerby: teamA.clubId === teamB.clubId,
			isRepeat: false,
			conflicts: teamA.clubId === teamB.clubId ? [
				{ type: 'derby', message: 'Vereins-Duell (Derby)', severity: 'warning' }
			] : [],
			createdAt: nowISO(),
			updatedAt: nowISO()
		};

		matches.push(match);
	}

	return createScheduleObject(config.id, matches, teams);
}

// ============================================================================
// HELFERFUNKTIONEN
// ============================================================================

/**
 * Berechnet die Gesamtzahl der möglichen Paarungen
 */
export function calculatePossiblePairings(teams: Team[], avoidDerbys: boolean = true): number {
	const uniquePairs = new Set<string>();
	
	for (let i = 0; i < teams.length; i++) {
		for (let j = i + 1; j < teams.length; j++) {
			if (avoidDerbys && teams[i].clubId === teams[j].clubId) {
				continue;
			}
			uniquePairs.add(`${teams[i].id}-${teams[j].id}`);
		}
	}
	
	return uniquePairs.size;
}

/**
 * Prüft, ob ein gültiger Spielplan möglich ist
 */
export function isSchedulePossible(
	teams: Team[],
	fields: Field[],
	config: TournamentConfig,
	avoidDerbys: boolean = true
): { possible: boolean; message: string } {
	const requiredMatches = config.rounds * Math.min(
		Math.floor(teams.length / 2),
		fields.length
	);
	
	const possiblePairings = calculatePossiblePairings(teams, avoidDerbys);
	
	if (possiblePairings < requiredMatches) {
		const derbysNeeded = requiredMatches - possiblePairings;
		return {
			possible: false,
			message: `Nicht genug gültige Paarungen. Benötigt: ${requiredMatches}, Verfügbar (ohne Derbys): ${possiblePairings}. ` +
				`${derbysNeeded} Vereins-Duelle (Derbys) wären nötig.`
		};
	}

	if (teams.length < 2) {
		return { possible: false, message: 'Mindestens 2 Teams werden benötigt' };
	}

	if (fields.length === 0) {
		return { possible: false, message: 'Mindestens 1 Spielfeld wird benötigt' };
	}

	return { possible: true, message: '' };
}
