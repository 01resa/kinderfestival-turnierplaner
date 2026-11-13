<script lang="ts">
	/**
	 * Einstellungen & Konfiguration Section
	 * 
	 * Diese Komponente verwaltet:
	 * - Vereine & Teams
	 * - Turnierparameter
	 * - Ja nach aktuellen Schritt im geführten Flow
	 */
	
	import { onMount } from 'svelte';
	
	// Stores
	import {
		clubs,
		teams,
		teamsByClub,
		fields,
		config,
		schedule,
		uiState,
		addClub,
		updateClub,
		deleteClub,
		addTeam,
		updateTeam,
		deleteTeam,
		addField,
		updateField,
		deleteField,
		updateConfig,
		setCurrentStep,
		toggleSettingsExpanded
	} from '../stores/tournamentStore';
	
	// Typen
	import type { FieldType } from '../models/types';
	
	// Props
	interface Props {
		currentStep: number;
		goToStep: (step: number) => void;
	}
	
	let { currentStep, goToStep }: Props = $props();
	
	// Local State
	let isExpanded = $uiState?.isSettingsExpanded ?? true;
	let newClubName = '';
	let newFieldName = '';
	let newFieldType: FieldType = 'jugendtore';
	let newFieldCustomType = '';
	
	// Reagiere auf UI State Änderungen
	$: {
		if ($uiState?.isSettingsExpanded !== undefined) {
			isExpanded = $uiState.isSettingsExpanded;
		}
	}
	
	// Aktuelle Config
	$:
	configValue = $config;
	
	// Field Types
	const fieldTypes: { value: FieldType; label: string; useCustom?: boolean }[] = [
		{ value: 'jugendtore', label: 'Jugendtore' },
		{ value: 'monitore', label: 'Monitore' },
		{ value: 'kleinfeld', label: 'Kleinfeld' },
		{ value: 'grossfeld', label: 'Großfeld' },
		{ value: 'halle', label: 'Halle' },
		{ value: 'custom', label: 'Benutzerdefiniert', useCustom: true }
	];
	
	// Handlers
	function handleToggleExpand() {
		isExpanded = !isExpanded;
		toggleSettingsExpanded(isExpanded);
	}
	
	function handleAddClub() {
		if (newClubName.trim()) {
			addClub(newClubName);
			newClubName = '';
			goToStep(2);
		}
	}
	
	function handleAddTeam(clubId: string) {
		addTeam(clubId);
	}
	
	function handleAddField() {
		if (newFieldName.trim()) {
			addField(
				newFieldName,
				newFieldType,
				newFieldType === 'custom' ? newFieldCustomType : undefined
			);
			newFieldName = '';
			newFieldType = 'jugendtore';
			newFieldCustomType = '';
		}
	}
	
	function handleUpdateRounds(event: Event) {
		const value = parseInt((event.target as HTMLInputElement).value);
		if (!isNaN(value) && value >= 1) {
			updateConfig({ rounds: value });
		}
	}
	
	function handleUpdateMatchDuration(event: Event) {
		const value = parseInt((event.target as HTMLInputElement).value);
		if (!isNaN(value) && value >= 1) {
			updateConfig({ matchDuration: value });
		}
	}
	
	function handleUpdateBreakDuration(event: Event) {
		const value = parseInt((event.target as HTMLInputElement).value);
		if (!isNaN(value) && value >= 0) {
			updateConfig({ breakDuration: value });
		}
	}
	
	function handleUpdateStartDateTime(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		if (value) {
			updateConfig({ startDateTime: new Date(value).toISOString() });
		}
	}
	
	function handleUpdateTournamentName(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		updateConfig({ name: value });
	}
	
	// Schritt-Navigation
	function canProceedToStep(step: number): boolean {
		switch (step) {
			case 2:
				return $teams.length >= 2;
			case 3:
				return $schedule !== null;
			default:
				return true;
		}
	}
	
	// Leere Zustände
	$:
	hasNoClubs = $clubs.length === 0;
	$:
	hasNoTeams = $teams.length === 0;
	$:
	hasNoFields = $fields.length === 0;
	
	// Berechne nächste Spiel-Möglichkeiten
	$:
	canGenerate = $teams.length >= 2 && $fields.length > 0;
</script>

<div class="settings-section-container">
	<!-- Header -->
	<button 
		class="section-header"
		class:expanded={isExpanded}
		on:click={handleToggleExpand}
		aria-expanded={isExpanded}
		aria-controls="settings-content"
	>
		<div class="header-content">
			<span class="material-symbols-outlined icon">settings</span>
			<h2>Turnier-Einstellungen</h2>
			
			<!-- Fortschrittsanzeige -->
			<div class="step-indicator">
				<span class:active={currentStep >= 1}>1. Vereine</span>
				<span class:active={currentStep >= 2}>2. Konfiguration</span>
				<span class:active={currentStep >= 3}>3. Spielplan</span>
			</div>
		</div>
		
		<span class="material-symbols-outlined chevron">
			{isExpanded ? 'expand_less' : 'expand_more'}
		</span>
	</button>
	
	{#if isExpanded}
		<div id="settings-content" class="settings-content">
			<!-- Schritt 1: Vereine & Teams -->
			<div class:hidden={currentStep < 1} class="step-section">
				<h3>Vereine verwalten</h3>
				
				{#if hasNoClubs}
					<div class="empty-state">
						<span class="material-symbols-outlined empty-icon">group_add</span>
						<p>Noch keine Vereine angelegt</p>
						<p class="subtitle">Lege den ersten Verein an, um loszulegen</p>
					</div>
				{/if}
				
				<!-- Verein hinzufügen -->
				<div class="add-item-form">
					<input
						type="text"
						bind:value={newClubName}
						placeholder="Vereinsname eingeben"
						class="md3-text-field"
						aria-label="Vereinsname"
						enterkeyhint="done"
						on:keydown={(e) => {
							if (e.key === 'Enter' && newClubName.trim()) {
								handleAddClub();
							}
						}}
					/>
					<button 
						class="md3-button md3-button--tonal"
						on:click={handleAddClub}
						disabled={!newClubName.trim()}
						aria-label="Verein hinzufügen"
					>
						<span class="material-symbols-outlined">add</span>
					</button>
				</div>
				
				<!-- Vereinsliste -->
				<div class="item-list club-list">
					{#each $clubs as club (club.id)}
						<div class="club-card md3-card">
							<div class="club-header">
								<span class="material-symbols-outlined club-icon">sports_soccer</span>
								<h4>{club.name}</h4>
								<button 
									class="md3-icon-button"
									on:click={() => deleteClub(club.id)}
									aria-label={`Verein ${club.name} löschen`}
									data-confirm="Soll der Verein ${club.name} wirklich gelöscht werden? Alle Teams dieses Vereins werden ebenfalls gelöscht."
								>
									<span class="material-symbols-outlined">delete</span>
								</button>
							</div>
							
							<!-- Teamliste für diesen Verein -->
							<div class="team-list">
								{#each $teamsByClub[club.id] || [] as team (team.id)}
									<div class="team-item">
										<span class="team-name">{team.name}</span>
										<button 
											class="md3-icon-button small"
											on:click={() => deleteTeam(team.id)}
											aria-label={`Team ${team.name} löschen`}
											data-confirm="Soll das Team ${team.name} wirklich gelöscht werden?"
										>
											<span class="material-symbols-outlined">delete</span>
										</button>
									</div>
								{/each}
								
								<button 
									class="md3-button md3-button--outlined add-team-button"
									on:click={() => handleAddTeam(club.id)}
									aria-label="Neues Team hinzufügen"
								>
									<span class="material-symbols-outlined">add</span>
									Neues Team
								</button>
							</div>
						</div>
					{/each}
				</div>
				
				<!-- Navigation -->
				<div class="step-navigation">
					<button 
						class="md3-button md3-button--elevated"
						on:click={() => goToStep(2)}
						disabled={!canProceedToStep(2)}
						aria-label="Weiter zu Konfiguration"
					>
						Weiter zu Konfiguration
						<span class="material-symbols-outlined">arrow_forward</span>
					</button>
				</div>
			</div>
			
			<!-- Schritt 2: Turnierparameter -->
			<div class:hidden={currentStep < 2} class="step-section">
				<h3>Turnierparameter</h3>
				
				<!-- Turniername -->
				<div class="form-group">
					<label for="tournament-name">Turniername</label>
					<input
						id="tournament-name"
						type="text"
						value={$config.name || ''}
						on:change={handleUpdateTournamentName}
						placeholder="Mein Turnier"
						class="md3-text-field"
					/>
				</div>
				
				<!-- Spielrunden -->
				<div class="form-group">
					<label for="rounds">Anzahl der Spielrunden</label>
					<input
						id="rounds"
						type="number"
						value={$config.rounds}
						on:change={handleUpdateRounds}
						min="1"
						max="20"
						class="md3-text-field"
					/>
					<span class="hint">Standard: 5</span>
				</div>
				
				<!-- Spieldauer -->
				<div class="form-group">
					<label for="match-duration">Spieldauer pro Spiel (Minuten)</label>
					<input
						id="match-duration"
						type="number"
						value={$config.matchDuration}
						on:change={handleUpdateMatchDuration}
						min="1"
						max="120"
						class="md3-text-field"
					/>
					<span class="hint">Standard: 10</span>
				</div>
				
				<!-- Pausen -->
				<div class="form-group">
					<label for="break-duration">Pausen zwischen Spielen (Minuten)</label>
					<input
						id="break-duration"
						type="number"
						value={$config.breakDuration}
						on:change={handleUpdateBreakDuration}
						min="0"
						max="60"
						class="md3-text-field"
					/>
					<span class="hint">Standard: 3</span>
				</div>
				
				<!-- Startdatum & Uhrzeit -->
				<div class="form-group">
					<label for="start-datetime">Startdatum & Uhrzeit</label>
					<input
						id="start-datetime"
						type="datetime-local"
						value={$config.startDateTime ? $config.startDateTime.replace('Z', '') : ''}
						on:change={handleUpdateStartDateTime}
						class="md3-text-field"
					/>
					<span class="hint">Standard: Nächster Samstag, 10:30 Uhr</span>
				</div>
				
				<!-- Spielfelder -->
				<div class="form-section">
					<h4>Spielfelder</h4>
					
					{#if hasNoFields}
						<div class="empty-state small">
							<span class="material-symbols-outlined">sports_rugby</span>
							<p>Noch keine Spielfelder angelegt</p>
						</div>
					{/if}
					
					<!-- Spielfeld hinzufügen -->
					<div class="add-item-form">
						<input
							type="text"
							bind:value={newFieldName}
							placeholder="Feldname"
							class="md3-text-field"
						/>
						
						<select 
							bind:value={newFieldType}
							class="md3-text-field"
							aria-label="Feldtyp"
						>
							{#each fieldTypes as type}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
						
						{#if newFieldType === 'custom'}
							<input
								type="text"
								bind:value={newFieldCustomType}
								placeholder="Benutzerdefinierter Typ"
								class="md3-text-field"
							/>
						{/if}
						
						<button 
							class="md3-button md3-button--tonal"
							on:click={handleAddField}
							disabled={!newFieldName.trim()}
							aria-label="Spielfeld hinzufügen"
						>
							<span class="material-symbols-outlined">add</span>
						</button>
					</div>
					
					<!-- Spielfeldliste -->
					<div class="item-list field-list">
						{#each $fields as field (field.id)}
							<div class="field-card md3-card">
								<div class="field-info">
									<span class="material-symbols-outlined field-icon">sports_rugby</span>
									<div>
										<h4>{field.name}</h4>
										<p class="field-type">
											{field.type === 'custom' ? field.customType || 'Benutzerdefiniert' : field.type}
										</p>
									</div>
								</div>
								<button 
									class="md3-icon-button"
									on:click={() => deleteField(field.id)}
									aria-label={`Spielfeld ${field.name} löschen`}
									data-confirm="Soll das Spielfeld wirklich gelöscht werden? Alle Spiele auf diesem Feld werden ebenfalls gelöscht."
								>
									<span class="material-symbols-outlined">delete</span>
								</button>
							</div>
						{/each}
					</div>
				</div>
				
				<!-- Navigation -->
				<div class="step-navigation">
					<button 
						class="md3-button md3-button--outlined"
						on:click={() => goToStep(1)}
						aria-label="Zurück zu Vereinen"
					>
						<span class="material-symbols-outlined">arrow_back</span>
						Zurück
					</button>
					<button 
						class="md3-button md3-button--elevated"
						on:click={() => goToStep(3)}
						disabled={!canGenerate}
						aria-label="Spielplan generieren"
					>
						Spielplan generieren
						<span class="material-symbols-outlined">auto_awesome</span>
					</button>
				</div>
			</div>
			
			<!-- Schritt 3: Spielplan -->
			<div class:hidden={currentStep < 3} class="step-section">
				<h3>Spielplan generiert!</h3>
				<p>Der Spielplan wurde erfolgreich erstellt. Du kannst ihn nun anpassen oder exportieren.</p>
				
				<div class="step-navigation">
					<button 
						class="md3-button md3-button--outlined"
						on:click={() => goToStep(2)}
						aria-label="Zurück zur Konfiguration"
					>
						<span class="material-symbols-outlined">arrow_back</span>
						Zurück
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.settings-section-container {
		width: 100%;
		background: var(--md-sys-color-surface-container, #fff);
		border-radius: var(--md-sys-shape-medium, 12px);
		box-shadow: var(--md-sys-shadow-level-1, 0 1px 3px rgba(0,0,0,0.1));
		overflow: hidden;
	}
	
	.section-header {
		width: 100%;
		padding: 16px 20px;
		background: var(--md-sys-color-surface-container-high, #f8f8f8);
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
		transition: background 0.2s ease;
	}
	
	.section-header:hover {
		background: var(--md-sys-color-surface-container-highest, #e8e8e8);
	}
	
	.section-header:focus {
		outline: 2px solid var(--md-sys-color-primary, #6750a4);
		outline-offset: -2px;
	}
	
	.header-content {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-start;
	}
	
	.section-header h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--md-sys-color-on-surface, #000);
		display: flex;
		align-items: center;
		gap: 8px;
	}
	
	.icon {
		color: var(--md-sys-color-primary, #6750a4);
		font-size: 1.5rem;
	}
	
	.chevron {
		color: var(--md-sys-color-on-surface-variant, #666);
		font-size: 1.5rem;
		transition: transform 0.2s ease;
	}
	
	.section-header.expanded .chevron {
		transform: rotate(180deg);
	}
	
	.settings-content {
		padding: 20px;
		background: var(--md-sys-color-surface, #fff);
	}
	
	.step-indicator {
		display: flex;
		gap: 8px;
		font-size: 0.8rem;
		color: var(--md-sys-color-on-surface-variant, #666);
	}
	
	.step-indicator span {
		padding: 2px 8px;
		border-radius: 12px;
		background: var(--md-sys-color-surface-container-highest, #e8e8e8);
	}
	
	.step-indicator span.active {
		background: var(--md-sys-color-primary-container, #e8dff4);
		color: var(--md-sys-color-on-primary-container, #21005e);
		font-weight: 600;
	}
	
	/* Step Section */
	.step-section {
		animation: fadeIn 0.3s ease;
	}
	
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}
	
	/* Form Groups */
	.form-group {
		margin-bottom: 16px;
	}
	
	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface-variant, #666);
		margin-bottom: 4px;
		display: block;
	}
	
	.form-group .hint {
		font-size: 0.75rem;
		color: var(--md-sys-color-on-surface-variant, #888);
		margin-top: 4px;
		display: block;
	}
	
	.form-section {
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
	}
	
	.form-section h4 {
		margin: 0 0 12px 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--md-sys-color-on-surface, #000);
	}
	
	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 32px 16px;
		color: var(--md-sys-color-on-surface-variant, #666);
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		border-radius: var(--md-sys-shape-medium, 12px);
		margin-bottom: 16px;
	}
	
	.empty-state .empty-icon {
		font-size: 3rem;
		color: var(--md-sys-color-outline, #ccc);
		margin-bottom: 8px;
	}
	
	.empty-state p {
		margin: 0;
		font-size: 0.9rem;
	}
	
	.empty-state .subtitle {
		font-size: 0.8rem;
		color: var(--md-sys-color-on-surface-variant, #888);
		margin-top: 4px;
	}
	
	.empty-state.small {
		padding: 16px;
	}
	
	.empty-state.small .empty-icon {
		font-size: 2rem;
	}
	
	/* Add Item Form */
	.add-item-form {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
		flex-wrap: wrap;
	}
	
	.add-item-form input,
	.add-item-form select {
		flex: 1;
		min-width: 150px;
	}
	
	.add-item-form button {
		flex: 0 0 auto;
		min-width: 44px;
		width: 44px;
		height: 44px;
		padding: 0;
	}
	
	.add-item-form button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	/* Item Lists */
	.item-list {
		gap: 12px;
		margin-bottom: 16px;
	}
	
	/* Club Card */
	.club-card {
		padding: 12px;
		border-radius: var(--md-sys-shape-medium, 12px);
		border: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
	}
	
	.club-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 0;
		border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
		margin-bottom: 8px;
	}
	
	.club-header h4 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--md-sys-color-on-surface, #000);
		flex: 1;
	}
	
	.club-icon,
	.field-icon {
		color: var(--md-sys-color-primary, #6750a4);
		font-size: 1.25rem;
	}
	
	.team-list {
		gap: 8px;
	}
	
	.team-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 12px;
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		border-radius: var(--md-sys-shape-small, 8px);
		font-size: 0.875rem;
	}
	
	.team-name {
		color: var(--md-sys-color-on-surface, #000);
	}
	
	.add-team-button {
		width: 100%;
		margin-top: 8px;
		justify-content: center;
		gap: 8px;
	}
	
	/* Field Card */
	.field-card {
		padding: 12px;
		border-radius: var(--md-sys-shape-medium, 12px);
		border: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	
	.field-info {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
	}
	
	.field-info h4 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--md-sys-color-on-surface, #000);
	}
	
	.field-type {
		margin: 0;
		font-size: 0.75rem;
		color: var(--md-sys-color-on-surface-variant, #666);
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		padding: 2px 8px;
		border-radius: 12px;
	}
	
	/* Step Navigation */
	.step-navigation {
		display: flex;
		gap: 12px;
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
	}
	
	.step-navigation button {
		flex: 1;
		min-width: 150px;
	}
	
	.step-navigation button span {
		font-size: 1.1rem;
		vertical-align: middle;
	}
	
	/* Responsive */
	@media (max-width: 600px) {
		.add-item-form {
			flex-direction: column;
		}
		
		.add-item-form input,
		.add-item-form select {
			width: 100%;
		}
		
		.add-item-form button {
			width: 100%;
		}
		
		.step-navigation {
			flex-direction: column;
		}
		
		.step-navigation button {
			width: 100%;
		}
		
		.club-header {
			flex-wrap: wrap;
		}
		
		.field-card {
			flex-direction: column;
			align-items: flex-start;
		}
		
		.field-info {
			flex-direction: column;
			align-items: flex-start;
			gap: 4px;
		}
	}
</style>
