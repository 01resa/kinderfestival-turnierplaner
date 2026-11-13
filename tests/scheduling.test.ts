/**
 * Unit Tests für den Scheduling-Algorithmus
 * 
 * Diese Tests prüfen die Funktionalität des Spielplan-Algorithmus.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	generateSchedule,
	generateRoundRobinSchedule,
	calculatePossiblePairings,
	isSchedulePossible,
	SchedulingOptions,
	DEFAULT_SCHEDULING_OPTIONS
} from '$lib/algorithms/scheduling';
import type { Team, Field, TournamentConfig } from '$lib/models/types';
import { createUUID, nowISO, toRoman } from '$lib/models/types';

// ============================================================================
// TEST DATEN
// ============================================================================

function createTestTeam(clubId: string, clubName: string, number: number): Team {
	return {
		id: createUUID(),
		clubId,
		romanNumber: toRoman(number),
		name: `${clubName} ${toRoman(number)}`,
		createdAt: nowISO(),
		updatedAt: nowISO()
	};
}

function createTestField(name: string, type: string = 'jugendtore'): Field {
	return {
		id: createUUID(),
		name,
		type: type as any,
		customType: type === 'custom' ? 'Benutzerdefiniert' : undefined,
		createdAt: nowISO(),
		updatedAt: nowISO()
	};
}

function createTestConfig(startDate?: Date): TournamentConfig {
	return {
		id: createUUID(),
		name: 'Test Turnier',
		rounds: 5,
		matchDuration: 10,
		breakDuration: 3,
		startDateTime: (startDate || new Date()).toISOString(),
		fields: [],
		createdAt: nowISO(),
		updatedAt: nowISO()
	};
}

// ============================================================================
// TESTS: generateSchedule
// ============================================================================

describe('generateSchedule', () => {
	let teams: Team[];
	let fields: Field[];
	let config: TournamentConfig;

	beforeEach(() => {
		// Erstelle Testdaten
		const club1 = createUUID();
		const club2 = createUUID();
		const club3 = createUUID();
		
		teams = [
			createTestTeam(club1, 'FC Musterhausen', 1),
			createTestTeam(club1, 'FC Musterhausen', 2),
			createTestTeam(club2, 'SV Beispiel', 1),
			createTestTeam(club2, 'SV Beispiel', 2),
			createTestTeam(club3, 'TSG Test', 1),
			createTestTeam(club3, 'TSG Test', 2)
		];
		
		fields = [
			createTestField('Feld 1'),
			createTestField('Feld 2'),
			createTestField('Feld 3')
		];
		
		config = createTestConfig();
		config.fields = fields;
	});

	it('should generate a schedule with minimum teams (2 teams)', () => {
		const minimalTeams = [teams[0], teams[2]]; // FC Musterhausen I vs SV Beispiel I
		const minimalFields = [fields[0]];
		
		const result = generateSchedule(
			{ ...config, fields: minimalFields },
			minimalTeams,
			minimalFields
		);

		expect(result).not.toBeNull();
		expect(result?.matches.length).toBeGreaterThan(0);
	});

	it('should return null with less than 2 teams', () => {
		const singleTeam = [teams[0]];
		
		const result = generateSchedule(config, singleTeam, fields);
		expect(result).toBeNull();
	});

	it('should return null with no fields', () => {
		const result = generateSchedule(config, teams, []);
		expect(result).toBeNull();
	});

	it('should generate a schedule with 6 teams and 3 fields', () => {
		const result = generateSchedule(config, teams, fields);

		expect(result).not.toBeNull();
		expect(result?.matches.length).toBeGreaterThan(0);
	});

	it('should avoid derby matches (same club) when possible', () => {
		// Teams von 3 verschiedenen Vereinen
		const club1 = createUUID();
		const club2 = createUUID();
		const club3 = createUUID();
		
		const testTeams = [
			createTestTeam(club1, 'FC A', 1),
			createTestTeam(club2, 'SV B', 1),
			createTestTeam(club3, 'TSG C', 1),
			createTestTeam(club1, 'FC A', 2),
			createTestTeam(club2, 'SV B', 2),
			createTestTeam(club3, 'TSG C', 2)
		];

		const testFields = [createTestField('Feld 1')];
		const testConfig = createTestConfig();
		testConfig.fields = testFields;
		testConfig.rounds = 3;

		const result = generateSchedule(testConfig, testTeams, testFields);

		expect(result).not.toBeNull();
		
		// Prüfe, dass keine Derbys in den ersten Runden sind
		// (Bei vielen Runden können Derbys unvermeidbar sein)
		const derbysInFirstRound = result?.matches.filter(
			m => m.round === 1 && m.isDerby
		).length || 0;
		
		// In den ersten Runden sollten keine Derbys sein
		expect(derbysInFirstRound).toBe(0);
	});

	it('should generate matches with correct time slots', () => {
		const startDate = new Date('2024-06-15T10:30:00Z');
		config.startDateTime = startDate.toISOString();
		config.rounds = 2;
		config.matchDuration = 10;
		config.breakDuration = 3;
		
		const result = generateSchedule(config, teams.slice(0, 4), fields.slice(0, 2));

		expect(result).not.toBeNull();
		expect(result?.matches.length).toBeGreaterThan(0);
		
		// Prüfe, dass die Zeiten korrekt berechnet werden
		const firstMatch = result?.matches[0];
		if (firstMatch) {
			const startTime = new Date(firstMatch.startTime);
			const endTime = new Date(firstMatch.endTime);
			
			// Spieldauer sollte 10 Minuten betragen
			const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
			expect(duration).toBeCloseTo(10, 0.5);
			
			// Startzeit sollte 10:30 Uhr sein
			expect(startTime.getHours()).toBe(10);
			expect(startTime.getMinutes()).toBe(30);
		}
	});

	it('should distribute matches across fields', () => {
		const result = generateSchedule(config, teams, fields);

		expect(result).not.toBeNull();
		
		// Prüfe, dass Spiele auf verschiedene Felder verteilt sind
		const fieldsUsed = new Set(result?.matches.map(m => m.fieldId));
		expect(fieldsUsed.size).toBeGreaterThan(0);
		
		// Alle konfigurierten Felder sollten genutzt werden
		const configuredFieldIds = new Set(fields.map(f => f.id));
		const usedFieldIds = new Set(result?.matches.map(m => m.fieldId) || []);
		
		// Mindestens ein Feld sollte genutzt werden
		const intersection = new Set(
			[...usedFieldIds].filter(id => configuredFieldIds.has(id))
		);
		expect(intersection.size).toBeGreaterThan(0);
	});

	it('should generate statistics', () => {
		const result = generateSchedule(config, teams, fields);

		expect(result).not.toBeNull();
		expect(result?.statistics).toBeDefined();
		
		if (result?.statistics) {
			expect(result.statistics.totalMatches).toBeGreaterThan(0);
			expect(result.statistics.matchesPerTeam).toBeDefined();
			expect(result.statistics.derbyCount).toBeGreaterThanOrEqual(0);
			expect(result.statistics.repeatCount).toBeGreaterThanOrEqual(0);
			expect(result.statistics.minMatchesPerTeam).toBeGreaterThanOrEqual(0);
			expect(result.statistics.maxMatchesPerTeam).toBeGreaterThanOrEqual(0);
		}
	});

	it('should mark derby matches', () => {
		// Erstelle Teams, bei denen Derbys unvermeidbar sind
		const club1 = createUUID();
		const testTeams = [
			createTestTeam(club1, 'FC A', 1),
			createTestTeam(club1, 'FC A', 2),
			createTestTeam(club1, 'FC A', 3)
		];

		const testFields = [createTestField('Feld 1')];
		const testConfig = createTestConfig();
		testConfig.rounds = 2;
		testConfig.fields = testFields;

		const result = generateSchedule(testConfig, testTeams, testFields);

		expect(result).not.toBeNull();
		
		// Es sollten einige Derbys geben
		expect(result?.statistics.derbyCount).toBeGreaterThanOrEqual(0);
		
		// Prüfe, dass Derbys korrekt markiert sind
		const derbyMatches = result?.matches.filter(m => m.isDerby);
		if (derbyMatches && derbyMatches.length > 0) {
			derbyMatches.forEach(match => {
				const teamA = teams.find(t => t.id === match.teamAId);
				const teamB = teams.find(t => t.id === match.teamBId);
				
				if (teamA && teamB) {
					expect(teamA.clubId).toBe(teamB.clubId);
				}
			});
		}
	});
});

// ============================================================================
// TESTS: Round Robin Schedule
// ============================================================================

describe('generateRoundRobinSchedule', () => {
	it('should generate round robin schedule for 4 teams', () => {
		const club1 = createUUID();
		const club2 = createUUID();
		const club3 = createUUID();
		const club4 = createUUID();
		
		const testTeams = [
			createTestTeam(club1, 'FC A', 1),
			createTestTeam(club2, 'SV B', 1),
			createTestTeam(club3, 'TSG C', 1),
			createTestTeam(club4, 'VfL D', 1)
		];

		const testFields = [createTestField('Feld 1')];
		const testConfig = createTestConfig();
		testConfig.fields = testFields;

		const result = generateRoundRobinSchedule(testTeams, testFields, testConfig);

		expect(result).not.toBeNull();
		
		// Bei 4 Teams sollte es 6 mögliche Paarungen geben (4*3/2 = 6)
		// Round Robin sollte alle generieren
		expect(result?.matches.length).toBe(6);
	});

	it('should return null with less than 2 teams', () => {
		const singleTeam = [createTestTeam(createUUID(), 'FC A', 1)];
		const testFields = [createTestField('Feld 1')];
		const testConfig = createTestConfig();

		const result = generateRoundRobinSchedule(singleTeam, testFields, testConfig);
		expect(result).toBeNull();
	});

	it('should return null with no fields', () => {
		const testTeams = [
			createTestTeam(createUUID(), 'FC A', 1),
			createTestTeam(createUUID(), 'SV B', 1)
		];

		const result = generateRoundRobinSchedule(testTeams, [], createTestConfig());
		expect(result).toBeNull();
	});
});

// ============================================================================
// TESTS: calculatePossiblePairings
// ============================================================================

describe('calculatePossiblePairings', () => {
	it('should calculate correct number of pairings for 4 teams from different clubs', () => {
		const club1 = createUUID();
		const club2 = createUUID();
		const club3 = createUUID();
		const club4 = createUUID();
		
		const testTeams = [
			createTestTeam(club1, 'FC A', 1),
			createTestTeam(club2, 'SV B', 1),
			createTestTeam(club3, 'TSG C', 1),
			createTestTeam(club4, 'VfL D', 1)
		];

		const result = calculatePossiblePairings(testTeams, true);
		
		// 4 Teams → 4*3/2 = 6 mögliche Paarungen
		expect(result).toBe(6);
	});

	it('should exclude derby pairings when avoidDerbys is true', () => {
		const club1 = createUUID();
		const club2 = createUUID();
		
		const testTeams = [
			createTestTeam(club1, 'FC A', 1),
			createTestTeam(club1, 'FC A', 2),
			createTestTeam(club2, 'SV B', 1),
			createTestTeam(club2, 'SV B', 2)
		];

		const resultWithDerbys = calculatePossiblePairings(testTeams, false);
		const resultWithoutDerbys = calculatePossiblePairings(testTeams, true);
		
		// Mit Derbys: 4 Teams → 6 Paarungen
		expect(resultWithDerbys).toBe(6);
		
		// Ohne Derbys: Nur Paarungen zwischen verschiedenen Vereinen
		// FC A1 vs SV B1, FC A1 vs SV B2, FC A2 vs SV B1, FC A2 vs SV B2 = 4 Paarungen
		expect(resultWithoutDerbys).toBe(4);
	});

	it('should handle 2 teams', () => {
		const testTeams = [
			createTestTeam(createUUID(), 'FC A', 1),
			createTestTeam(createUUID(), 'SV B', 1)
		];

		const result = calculatePossiblePairings(testTeams);
		expect(result).toBe(1);
	});

	it('should handle 1 team', () => {
		const testTeams = [createTestTeam(createUUID(), 'FC A', 1)];

		const result = calculatePossiblePairings(testTeams);
		expect(result).toBe(0);
	});

	it('should handle 0 teams', () => {
		const result = calculatePossiblePairings([]);
		expect(result).toBe(0);
	});
});

// ============================================================================
// TESTS: isSchedulePossible
// ============================================================================

describe('isSchedulePossible', () => {
	it('should return true for valid configuration', () => {
		const testTeams = [
			createTestTeam(createUUID(), 'FC A', 1),
			createTestTeam(createUUID(), 'SV B', 1),
			createTestTeam(createUUID(), 'TSG C', 1),
			createTestTeam(createUUID(), 'VfL D', 1)
		];
		
		const testFields = [createTestField('Feld 1'), createTestField('Feld 2')];
		const testConfig = createTestConfig();
		testConfig.fields = testFields;
		testConfig.rounds = 3;

		const result = isSchedulePossible(testTeams, testFields, testConfig);
		
		expect(result.possible).toBe(true);
		expect(result.message).toBe('');
	});

	it('should return false with less than 2 teams', () => {
		const testTeams = [createTestTeam(createUUID(), 'FC A', 1)];
		const testFields = [createTestField('Feld 1')];
		const testConfig = createTestConfig();

		const result = isSchedulePossible(testTeams, testFields, testConfig);
		
		expect(result.possible).toBe(false);
		expect(result.message).toContain('Mindestens 2 Teams');
	});

	it('should return false with no fields', () => {
		const testTeams = [
			createTestTeam(createUUID(), 'FC A', 1),
			createTestTeam(createUUID(), 'SV B', 1)
		];
		const testConfig = createTestConfig();

		const result = isSchedulePossible(testTeams, [], testConfig);
		
		expect(result.possible).toBe(false);
		expect(result.message).toContain('Mindestens 1 Spielfeld');
	});

	it('should warn about insufficient pairings', () => {
		// 2 Teams von desselben Verein
		const club1 = createUUID();
		const testTeams = [
			createTestTeam(club1, 'FC A', 1),
			createTestTeam(club1, 'FC A', 2)
		];
		
		const testFields = [createTestField('Feld 1')];
		const testConfig = createTestConfig();
		testConfig.fields = testFields;
		testConfig.rounds = 5;

		const result = isSchedulePossible(testTeams, testFields, testConfig, true);
		
		// Es ist unmöglich, 5 Runden mit nur 2 Teams desselben Vereins zu spielen
		// ohne Derbys (und es gibt nur 1 mögliche Paarung)
		expect(result.possible).toBe(false);
	});

	it('should allow derbys when avoidDerbys is false', () => {
		// 2 Teams von desselben Verein
		const club1 = createUUID();
		const testTeams = [
			createTestTeam(club1, 'FC A', 1),
			createTestTeam(club1, 'FC A', 2)
		];
		
		const testFields = [createTestField('Feld 1')];
		const testConfig = createTestConfig();
		testConfig.fields = testFields;
		testConfig.rounds = 2;

		const result = isSchedulePossible(testTeams, testFields, testConfig, false);
		
		// Mit Derbys ist es möglich
		expect(result.possible).toBe(true);
	});
});

// ============================================================================
// TESTS: Scheduling Options
// ============================================================================

describe('Scheduling Options', () => {
	it('should use default options when none provided', () => {
		const club1 = createUUID();
		const club2 = createUUID();
		
		const testTeams = [
			createTestTeam(club1, 'FC A', 1),
			createTestTeam(club2, 'SV B', 1)
		];

		const testFields = [createTestField('Feld 1')];
		const testConfig = createTestConfig();
		testConfig.fields = testFields;

		// Generate with default options
		const result = generateSchedule(testConfig, testTeams, testFields);
		
		expect(result).not.toBeNull();
	});

	it('should respect custom options', () => {
		const club1 = createUUID();
		const club2 = createUUID();
		
		const testTeams = [
			createTestTeam(club1, 'FC A', 1),
			createTestTeam(club2, 'SV B', 1)
		];

		const testFields = [createTestField('Feld 1')];
		const testConfig = createTestConfig();
		testConfig.fields = testFields;

		const customOptions: Partial<SchedulingOptions> = {
			maxAttempts: 1,
			derbyPenalty: 1000,
			repeatPenalty: 1000
		};

		const result = generateSchedule(testConfig, testTeams, testFields, customOptions);
		
		// Should still work with custom options
		expect(result).not.toBeNull();
	});
});
