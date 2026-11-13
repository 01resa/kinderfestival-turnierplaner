<script lang="ts">
	/**
	 * ActionBar - Aktionsleiste oben in der App
	 * 
	 * Enthält:
	 * - App-Logo & Titel
	 * - Aktuelle Schritt-Anzeige
	 * - Aktions-Buttons (Generieren, Export, etc.)
	 */
	
	import type { Writable } from 'svelte/store';
	
	// Stores
	import { tournamentState } from '../stores/tournamentStore';
	
	// Services
	import { downloadAsFile, importFromFile } from '../services/storageService';
	import { generateSchedule, isSchedulePossible } from '../algorithms/scheduling';
	import { getTournamentState } from '../stores/tournamentStore';
	
	// Props
	interface Props {
		onGenerate: () => void;
		currentStep: number;
		teamCount: number;
		fieldCount: number;
		onShowTutorial: () => void;
	}
	
	let { onGenerate, currentStep, teamCount, fieldCount, onShowTutorial }: Props = $props();
	
	// Local State
	let showMenu = false;
	let showConfirmDialog = false;
	let confirmMessage = '';
	let confirmCallback: (() => void) | null = null;
	
	// Handlers
	function handleExport() {
		const state = getTournamentState();
		downloadAsFile(state);
		showMenu = false;
	}
	
	function handleImport() {
		importFromFile((importedState) => {
			if (importedState) {
				tournamentState.set(importedState);
			}
		});
		showMenu = false;
	}
	
	function handlePrint() {
		window.print();
		showMenu = false;
	}
	
	function handleReset() {
		confirmMessage = 'Möchtest du wirklich alle Daten zurücksetzen? Dieser Vorgang kann nicht rückgängig gemacht werden.';
		confirmCallback = () => {
			// Reset Logic
			if (confirm('Bist du sicher? Alle Daten gehen verloren!')) {
				localStorage.clear();
				window.location.reload();
			}
		};
		showConfirmDialog = true;
		showMenu = false;
	}
	
	function handleConfirm() {
		if (confirmCallback) {
			confirmCallback();
			confirmCallback = null;
		}
		showConfirmDialog = false;
	}
	
	function handleCancel() {
		showConfirmDialog = false;
		confirmCallback = null;
	}
	
	function handleMenuClick(event: MouseEvent) {
		event.stopPropagation();
		showMenu = !showMenu;
	}
	
	// Close menu when clicking outside
	import { onMount } from 'svelte';
	
	function handleDocumentClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.menu-container')) {
			showMenu = false;
		}
	}
	
	onMount(() => {
		document.addEventListener('click', handleDocumentClick);
		return () => document.removeEventListener('click', handleDocumentClick);
	});
	
	// Prüfe, ob Generieren möglich ist
	$:
	canGenerate = teamCount >= 2 && fieldCount > 0;
	
	$:
	canGenerateMessage = isSchedulePossible(
		getTournamentState().teams,
		getTournamentState().fields,
		getTournamentState().config
	);
</script>

<div class="action-bar">
	<div class="bar-content">
		<!-- Logo & Titel -->
		<div class="logo-section">
			<span class="material-symbols-outlined logo-icon">sports_soccer</span>
			<h1>Turnierplaner</h1>
		</div>
		
		<!-- Schritt-Fortschritt -->
		<div class="progress-section">
			<div class="step-indicator">
				<div 
					class="step"
					class:active={currentStep >= 1}
					class:completed={currentStep > 1}
				>
					<span class="step-number">1</span>
					<span class="step-label">Vereine</span>
				</div>
				<div class="step-connector"></div>
				<div 
					class="step"
					class:active={currentStep >= 2}
					class:completed={currentStep > 2}
				>
					<span class="step-number">2</span>
					<span class="step-label">Konfiguration</span>
				</div>
				<div class="step-connector"></div>
				<div 
					class="step"
					class:active={currentStep >= 3}
					class:completed={currentStep > 3}
				>
					<span class="step-number">3</span>
					<span class="step-label">Spielplan</span>
				</div>
			</div>
			
			<!-- Status -->
			<div class="status-text">
				{#if teamCount < 2}
					<span class="status-warning">
						<span class="material-symbols-outlined">warning</span>
						{teamCount} Teams - Mindestens 2 benötigt
					</span>
				{:else if fieldCount === 0}
					<span class="status-warning">
						<span class="material-symbols-outlined">warning</span>
						Keine Spielfelder konfiguriert
					</span>
				{:else if currentStep >= 3}
					<span class="status-success">
						<span class="material-symbols-outlined">check_circle</span>
						Spielplan generiert
					</span>
				{:else}
					<span class="status-info">
						Bereit für Schritt {currentStep}
					</span>
				{/if}
			</div>
		</div>
		
		<!-- Aktionen -->
		<div class="actions-section">
			<!-- Tutorial Button -->
			<button 
				class="action-button icon-button"
				on:click={onShowTutorial}
				aria-label="Hilfe anzeigen"
				title="Hilfe"
			>
				<span class="material-symbols-outlined">help_outline</span>
			</button>
			
			<!-- Generieren Button -->
			{#if currentStep < 3}
				<button 
					class="action-button primary"
					on:click={onGenerate}
					disabled={!canGenerate}
					aria-label="Spielplan generieren"
					title={!canGenerate ? 'Mindestens 2 Teams und 1 Spielfeld werden benötigt' : 'Spielplan generieren'}
				>
					<span class="material-symbols-outlined">auto_awesome</span>
					<span>Generieren</span>
				</button>
			{:else}
				<button 
					class="action-button primary"
					on:click={onGenerate}
					aria-label="Spielplan neu berechnen"
					title="Spielplan neu berechnen"
				>
					<span class="material-symbols-outlined">refresh</span>
					<span>Neu berechnen</span>
				</button>
			{/if}
			
			<!-- Menü Button -->
			<div class="menu-container">
				<button 
					class="action-button icon-button"
					on:click={handleMenuClick}
					aria-label="Mehr Optionen"
					aria-expanded={showMenu}
					aria-haspopup="true"
				>
					<span class="material-symbols-outlined">more_vert</span>
				</button>
				
				{#if showMenu}
					<div class="menu-dropdown md3-card">
						<button 
							class="menu-item"
							on:click={handleExport}
							aria-label="Exportieren"
						>
							<span class="material-symbols-outlined">download</span>
							<span>Exportieren (JSON)</span>
						</button>
						<button 
							class="menu-item"
							on:click={handleImport}
							aria-label="Importieren"
						>
							<span class="material-symbols-outlined">upload</span>
							<span>Importieren (JSON)</span>
						</button>
						<button 
							class="menu-item"
							on:click={handlePrint}
							aria-label="Drucken"
						>
							<span class="material-symbols-outlined">print</span>
							<span>Drucken</span>
						</button>
						<div class="menu-divider"></div>
						<button 
							class="menu-item menu-item-danger"
							on:click={handleReset}
							aria-label="Alles zurücksetzen"
						>
							<span class="material-symbols-outlined">restart_alt</span>
							<span>Alles zurücksetzen</span>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
	
	<!-- Bestätigungsdialog -->
	{#if showConfirmDialog}
		<div class="confirm-dialog-overlay" on:click={handleCancel}>
			<div class="confirm-dialog md3-card" on:click|stopPropagation>
				<div class="dialog-header">
					<h3>Bestätigung erforderlich</h3>
					<button class="close-button" on:click={handleCancel} aria-label="Schließen">
						<span class="material-symbols-outlined">close</span>
					</button>
				</div>
				<div class="dialog-content">
					<p>{confirmMessage}</p>
				</div>
				<div class="dialog-actions">
					<button 
						class="md3-button md3-button--text"
						on:click={handleCancel}
					>
						Abbrechen
					</button>
					<button 
						class="md3-button md3-button--elevated"
						on:click={handleConfirm}
						aria-label="Bestätigen"
					>
						Bestätigen
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.action-bar {
		width: 100%;
		background: var(--md-sys-color-primary, #6750a4);
		color: var(--md-sys-color-on-primary, #ffffff);
		padding: 12px 20px;
		position: sticky;
		top: 0;
		z-index: 100;
		box-shadow: var(--md-sys-shadow-level-2, 0 2px 8px rgba(0,0,0,0.15));
	}
	
	.bar-content {
		max-width: 1600px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
	}
	
	.logo-section {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 0 0 auto;
	}
	
	.logo-icon {
		font-size: 1.5rem;
	}
	
	.logo-section h1 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 700;
		letter-spacing: 0.5px;
	}
	
	.progress-section {
		flex: 1;
		min-width: 300px;
		order: 1;
	}
	
	.step-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		margin-bottom: 4px;
	}
	
	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 4px 8px;
		border-radius: 8px;
		transition: all 0.2s ease;
	}
	
	.step-number {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--md-sys-color-on-surface-variant, rgba(255,255,255,0.7));
	}
	
	.step.active .step-number,
	.step.completed .step-number {
		color: var(--md-sys-color-on-primary, #ffffff);
		font-weight: 700;
	}
	
	.step-label {
		font-size: 0.65rem;
		color: var(--md-sys-color-on-surface-variant, rgba(255,255,255,0.6));
		white-space: nowrap;
	}
	
	.step.active .step-label,
	.step.completed .step-label {
		color: var(--md-sys-color-on-primary, rgba(255,255,255,0.9));
	}
	
	.step-connector {
		width: 1px;
		height: 24px;
		background: var(--md-sys-color-on-surface-variant, rgba(255,255,255,0.3));
		margin: 0 4px;
	}
	
	.status-text {
		font-size: 0.8rem;
		color: var(--md-sys-color-on-surface-variant, rgba(255,255,255,0.8));
		margin-top: 4px;
		text-align: center;
	}
	
	.status-text .material-symbols-outlined {
		font-size: 0.9rem;
		vertical-align: middle;
		margin-right: 4px;
	}
	
	.status-warning {
		color: var(--md-sys-color-warning, #ff9800);
	}
	
	.status-success {
		color: var(--md-sys-color-success, #4caf50);
	}
	
	.status-info {
		color: var(--md-sys-color-on-surface-variant, rgba(255,255,255,0.7));
	}
	
	.actions-section {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 0 0 auto;
		order: 2;
	}
	
	.action-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		border-radius: 8px;
		border: none;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}
	
	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.action-button.icon-button {
		padding: 8px;
		width: 36px;
		height: 36px;
		border-radius: 50%;
	}
	
	.action-button.icon-button span {
		font-size: 1.1rem;
	}
	
	.action-button.primary {
		background: var(--md-sys-color-on-primary, #ffffff);
		color: var(--md-sys-color-primary, #6750a4);
	}
	
	.action-button.primary:hover:not(:disabled) {
		background: var(--md-sys-color-primary-container, #e8dff4);
		color: var(--md-sys-color-on-primary-container, #21005e);
	}
	
	.action-button span.material-symbols-outlined {
		font-size: 1.1rem;
	}
	
	/* Menu */
	.menu-container {
		position: relative;
	}
	
	.menu-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 4px;
		min-width: 200px;
		background: var(--md-sys-color-surface-container-highest, #ffffff);
		box-shadow: var(--md-sys-shadow-level-4, 0 6px 16px rgba(0,0,0,0.2));
		border-radius: var(--md-sys-shape-medium, 12px);
		padding: 8px;
		z-index: 1000;
		animation: fadeIn 0.2s ease;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.menu-item {
		width: 100%;
		background: none;
		border: none;
		padding: 12px 16px;
		text-align: left;
		cursor: pointer;
		border-radius: var(--md-sys-shape-small, 8px);
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 0.85rem;
		color: var(--md-sys-color-on-surface, #000);
		transition: all 0.2s ease;
	}
	
	.menu-item:hover {
		background: var(--md-sys-color-surface-container-high, #f8f8f8);
	}
	
	.menu-item span.material-symbols-outlined {
		font-size: 1.1rem;
		color: var(--md-sys-color-on-surface-variant, #666);
	}
	
	.menu-divider {
		height: 1px;
		background: var(--md-sys-color-outline-variant, #e0e0e0);
		margin: 4px 8px;
	}
	
	.menu-item.menu-item-danger:hover {
		background: var(--md-sys-color-error-container, #ffdada);
		color: var(--md-sys-color-on-error-container, #5c0000);
	}
	
	.menu-item.menu-item-danger span.material-symbols-outlined {
		color: var(--md-sys-color-error, #ff0000);
	}
	
	/* Confirm Dialog */
	.confirm-dialog-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		animation: fadeIn 0.2s ease;
	}
	
	.confirm-dialog {
		max-width: 400px;
		width: 90%;
		background: var(--md-sys-color-surface-container, #ffffff);
		border-radius: var(--md-sys-shape-large, 16px);
		box-shadow: var(--md-sys-shadow-level-4, 0 6px 16px rgba(0,0,0,0.2));
		padding: 0;
	}
	
	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
	}
	
	.dialog-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--md-sys-color-on-surface, #000);
	}
	
	.close-button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		border-radius: 50%;
		color: var(--md-sys-color-on-surface-variant, #666);
		transition: all 0.2s ease;
	}
	
	.close-button:hover {
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		color: var(--md-sys-color-on-surface, #000);
	}
	
	.close-button span {
		font-size: 1.25rem;
	}
	
	.dialog-content {
		padding: 16px 20px;
		color: var(--md-sys-color-on-surface-variant, #666);
		font-size: 0.9rem;
		line-height: 1.5;
	}
	
	.dialog-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		padding: 16px 20px;
		border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
	}
	
	.dialog-actions button {
		min-width: 80px;
	}
	
	/* Responsive */
	@media (max-width: 768px) {
		.bar-content {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}
		
		.logo-section {
			justify-content: center;
			order: 0;
		}
		
		.progress-section {
			order: 1;
			flex: none;
		}
		
		.actions-section {
			order: 2;
			flex-direction: row;
			justify-content: center;
			flex-wrap: wrap;
		}
		
		.step-indicator {
			flex-wrap: wrap;
			justify-content: center;
		}
		
		.step-connector {
			display: none;
		}
		
		.status-text {
			text-align: center;
		}
	}
	
	@media (max-width: 480px) {
		.logo-section h1 {
			font-size: 1rem;
		}
		
		.step-indicator {
			gap: 8px;
		}
		
		.step {
			padding: 4px 4px;
		}
		
		.step-number {
			font-size: 0.7rem;
		}
		
		.step-label {
			display: none;
		}
		
		.actions-section {
			gap: 4px;
		}
		
		.action-button.primary {
			padding: 6px 12px;
			font-size: 0.8rem;
		}
		
		.action-button.primary span:not(.material-symbols-outlined) {
			display: none;
		}
		
		.menu-dropdown {
			min-width: 160px;
		}
	}
</style>
