<script lang="ts">
	/**
	 * Hauptseite des Kinderfestival Turnierplaners
	 * 
	 * Diese Seite enthält die gesamte Single-Page-Anwendung mit drei Bereichen:
	 * 1. Oben: Einstellungen & Konfiguration
	 * 2. Mitte: Spielkombinationen (tabellarisch)
	 * 3. Unten: Grafische Spielfeld-Darstellung
	 */
	
	import { onMount, onDestroy } from 'svelte';
	
	// Browser detection (replacement for $app/environment)
	const browser = typeof window !== 'undefined';
	
	// Stores
	import {
		tournamentState,
		setTournamentState,
		getTournamentState,
		clubs,
		teams,
		fields,
		schedule,
		uiState,
		setCurrentStep,
		toggleSettingsExpanded
	} from './lib/stores/tournamentStore';
	
	// Services
	import { loadTournamentState, saveTournamentState, triggerAutoSave, cancelAutoSave } from './lib/services/storageService';
	
	// Komponenten
	import SettingsSection from './lib/components/SettingsSection.svelte';
	import MatchesTable from './lib/components/MatchesTable.svelte';
	import FieldGrid from './lib/components/FieldGrid.svelte';
	import TutorialOverlay from './lib/components/TutorialOverlay.svelte';
	import ActionBar from './lib/components/ActionBar.svelte';
	
	// Algorithmus
	import { generateSchedule } from './lib/algorithms/scheduling';
	import { getTournamentState as getCurrentState } from './lib/stores/tournamentStore';
	
	// State
	let isLoading = true;
	let showTutorial = false;
	
	// Lade den Zustand beim Start
	onMount(async () => {
		if (browser) {
			const savedState = await loadTournamentState();
			if (savedState) {
				setTournamentState(savedState);
			}
			
			// Auto-Save aktivieren
			tournamentState.subscribe((state) => {
				if (browser && !isLoading) {
					triggerAutoSave(state);
				}
			});
			
			// Beforeunload-Handler für Speichern
			const handleBeforeUnload = () => {
				const state = getTournamentState();
				saveTournamentState(state);
			};
			
			window.addEventListener('beforeunload', handleBeforeUnload);
			
			isLoading = false;
			
			// Cleanup
			return () => {
				window.removeEventListener('beforeunload', handleBeforeUnload);
			};
		}
	});
	
	// Speichere beim Beenden
	onDestroy(() => {
		cancelAutoSave();
		if (browser) {
			const state = getTournamentState();
			saveTournamentState(state);
		}
	});
	
	// Generiere Spielplan
	function handleGenerateSchedule() {
		const state = getCurrentState();
		const newSchedule = generateSchedule(
			state.config,
			state.teams,
			state.fields
		);
		
		if (newSchedule) {
			setTournamentState({
				...state,
				schedule: newSchedule,
				uiState: {
					...state.uiState,
					currentStep: 3
				}
			});
		} else {
			// Zeige Fehlermeldung
			alert('Konnte keinen gültigen Spielplan generieren. Bitte prüfen Sie die Einstellungen und Teams.');
		}
	}
	
	// Navigiere zu einem Schritt
	function goToStep(step: number) {
		setCurrentStep(step);
	}
	
	// Handle Key Events
	function handleKeydown(event: KeyboardEvent) {
		// Strg + S = Speichern
		if (event.ctrlKey && event.key === 's') {
			event.preventDefault();
			const state = getTournamentState();
			saveTournamentState(state);
		}
		
		// Strg + Z = Rückgängig (würde Undo-Stack benötigen)
		if (event.ctrlKey && event.key === 'z') {
			event.preventDefault();
			// TODO: Undo implementieren
		}
	}
	
	// Event-Listener für Tastatur
	let keydownHandler: ((event: KeyboardEvent) => void) | null = null;
	
	onMount(() => {
		if (browser) {
			keydownHandler = handleKeydown;
			window.addEventListener('keydown', keydownHandler);
		}
	});
	
	onDestroy(() => {
		if (keydownHandler && browser) {
			window.removeEventListener('keydown', keydownHandler);
		}
	});
</script>

<script lang="ts" module>
	// Set document title and meta tags
	if (browser) {
		document.title = 'Kinderfestival Turnierplaner';
		const metaDesc = document.querySelector('meta[name="description"]');
		if (metaDesc) {
			metaDesc.setAttribute('content', 'Turnierplanung für F-Jugend Teams (U7/U8)');
		}
		const metaTheme = document.querySelector('meta[name="theme-color"]');
		if (metaTheme) {
			metaTheme.setAttribute('content', '#6750a4');
		}
	}
</script>

<div class="app-container">
	<!-- Action Bar - Oben -->
	<ActionBar 
		onGenerate={handleGenerateSchedule}
		currentStep={$uiState?.currentStep || 1}
		teamCount={$teams.length}
		fieldCount={$fields.length}
		onShowTutorial={() => showTutorial = true}
	/>
	
	<!-- Hauptinhalte -->
	<main class="main-content">
		<!-- Bereich 1: Einstellungen & Konfiguration -->
		<section class="settings-section">
			<SettingsSection 
				currentStep={$uiState?.currentStep || 1}
				goToStep={goToStep}
			/>
		</section>
		
		<!-- Bereich 2: Spielkombinationen -->
		<section class="matches-section">
			<MatchesTable 
				matches={$schedule?.matches || []}
				teams={$teams}
				clubs={$clubs}
				fields={$fields}
			/>
		</section>
		
		<!-- Bereich 3: Grafische Spielfeld-Darstellung -->
		<section class="field-grid-section">
			<FieldGrid 
				matches={$schedule?.matches || []}
				teams={$teams}
				clubs={$clubs}
				fields={$fields}
			/>
		</section>
	</main>
	
	<!-- Tutorial Overlay -->
	{#if showTutorial}
		<TutorialOverlay onClose={() => showTutorial = false} />
	{/if}
</div>

<style>
	.app-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%);
	}
	
	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		max-width: 1600px;
		width: 100%;
		margin: 0 auto;
		padding: 0 16px;
		padding-bottom: 16px;
		gap: 24px;
	}
	
	.settings-section {
		order: 1;
	}
	
	.matches-section {
		order: 2;
		flex: 1;
		min-height: 300px;
	}
	
	.field-grid-section {
		order: 3;
		min-height: 400px;
	}
	
	@media (min-width: 1200px) {
		.main-content {
			flex-direction: row;
			flex-wrap: wrap;
		}
		
		.settings-section {
			flex: 0 0 350px;
			order: 1;
		}
		
		.matches-section {
			flex: 1;
			min-width: 400px;
			order: 2;
		}
		
		.field-grid-section {
			flex: 1;
			min-width: 500px;
			order: 3;
		}
	}
</style>
