<script lang="ts">
	/**
	 * FieldGrid - Grafische Spielfeld-Darstellung
	 * 
	 * Zeigt eine visuelle Übersicht der Spielfelder als "Court/Field Grid":
	 * - Pro Feld eine Spalte/Bahn
	 * - Zeitleiste von oben nach unten
	 * - Spiele als farbige Blöcke positioniert
	 * - Farbgebung pro Verein
	 * - Konflikte farblich hervorgehoben
	 */
	
	import { onMount, onDestroy } from 'svelte';
	import type { Match, Team, Club, Field } from '../models/types';
	
	// Props
	interface Props {
		matches: Match[];
		teams: Team[];
		clubs: Club[];
		fields: Field[];
	}
	
	let { matches, teams, clubs, fields }: Props = $props();
	
	// Local State
	let zoomLevel = 1.0;
	let isHorizontal = false;
	let showTimeMarkers = true;
	let nowLinePosition = 0;
	
	// Refs
	let gridContainer: HTMLDivElement;
	let zoomContainer: HTMLDivElement;
	
	// Helper Functions
	function getTeamById(teamId: string): Team | undefined {
		return teams.find(t => t.id === teamId);
	}
	
	function getClubById(clubId: string): Club | undefined {
		return clubs.find(c => c.id === clubId);
	}
	
	function getFieldById(fieldId: string): Field | undefined {
		return fields.find(f => f.id === fieldId);
	}
	
	function getClubColor(clubId: string): string {
		let hash = 0;
		for (let i = 0; i < clubId.length; i++) {
			hash = clubId.charCodeAt(i) + ((hash << 5) - hash);
		}
		
		const colors = [
			'#FF5722', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
			'#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
			'#8BC34A', '#CDDC39', '#FFC107', '#FF9800'
		];
		
		return colors[Math.abs(hash) % colors.length];
	}
	
	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString('de-DE', { 
			hour: '2-digit', 
			minute: '2-digit' 
		});
	}
	
	function formatShortTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString('de-DE', { 
			hour: '2-digit', 
			minute: '2-digit' 
		}).replace(':', '');
	}
	
	// Berechne Grid-Layout
	$:
	{
		// Sortiere Felder
		const sortedFields = [...fields].sort((a, b) => a.name.localeCompare(b.name));
		
		// Gruppiere Spiele nach Feld
		const matchesByField: Record<string, Match[]> = {};
		for (const match of matches) {
			if (!matchesByField[match.fieldId]) {
				matchesByField[match.fieldId] = [];
			}
			matchesByField[match.fieldId].push(match);
		}
		
		// Sortiere Spiele pro Feld nach Startzeit
		for (const fieldId in matchesByField) {
			matchesByField[fieldId].sort((a, b) => 
				new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
			);
		}
		
		// Finde min/max Zeiten
		let minTime = Infinity;
		let maxTime = -Infinity;
		
		for (const match of matches) {
			const start = new Date(match.startTime).getTime();
			const end = new Date(match.endTime).getTime();
			minTime = Math.min(minTime, start);
			maxTime = Math.max(maxTime, end);
		}
		
		// Wenn keine Spiele, setze Default
		if (minTime === Infinity) {
			minTime = Date.now();
			maxTime = Date.now() + 5 * 60 * 60 * 1000; // +5 Stunden
		}
		
		// Gesamtzeitspanne in Minuten
		const totalMinutes = (maxTime - minTime) / (60 * 1000);
		
		// Berechne "Jetzt" Position
		const now = Date.now();
		if (now >= minTime && now <= maxTime) {
			nowLinePosition = ((now - minTime) / (maxTime - minTime)) * 100;
		} else {
			nowLinePosition = -1; // Nicht im sichtbaren Bereich
		}
		
		// Speichere für Template
		fieldMatches = matchesByField;
		fieldList = sortedFields;
		timeSpanMinutes = totalMinutes;
		baseTime = minTime;
	}
	
	// Zoom Functions
	function zoomIn() {
		zoomLevel = Math.min(zoomLevel + 0.1, 2.0);
		updateScroll();
	}
	
	function zoomOut() {
		zoomLevel = Math.max(zoomLevel - 0.1, 0.5);
		updateScroll();
	}
	
	function resetZoom() {
		zoomLevel = 1.0;
		updateScroll();
	}
	
	function toggleOrientation() {
		isHorizontal = !isHorizontal;
		updateScroll();
	}
	
	function updateScroll() {
		// Zentriere den Inhalt
		if (zoomContainer) {
			zoomContainer.scrollLeft = (zoomContainer.scrollWidth - zoomContainer.clientWidth) / 2;
			zoomContainer.scrollTop = (zoomContainer.scrollHeight - zoomContainer.clientHeight) / 2;
		}
	}
	
	// Touch Support
	let touchStartX = 0;
	let touchStartY = 0;
	
	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 2) {
			e.preventDefault();
			// Pinch to zoom
			const touch1 = e.touches[0];
			const touch2 = e.touches[1];
			// Speichere Start-Positionen
		}
	}
	
	function handleTouchMove(e: TouchEvent) {
		if (e.touches.length === 2) {
			e.preventDefault();
			// Pinch to zoom Implementation
		}
	}
	
	// Mouse Wheel Zoom
	function handleWheel(e: WheelEvent) {
		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();
			if (e.deltaY > 0) {
				zoomOut();
			} else {
				zoomIn();
			}
		}
	}
	
	// Lifecycle
	onMount(() => {
		updateScroll();
		
		// Aktualisiere "Jetzt" Linie jede Minute
		const interval = setInterval(() => {
			const now = Date.now();
			if (now >= baseTime && now <= baseTime + timeSpanMinutes * 60 * 1000) {
				nowLinePosition = ((now - baseTime) / (timeSpanMinutes * 60 * 1000)) * 100;
			} else {
				nowLinePosition = -1;
			}
			
			// Force re-render
			fieldMatches = { ...fieldMatches };
		}, 60 * 1000);
		
		// Cleanup
		return () => clearInterval(interval);
	});
	
	// Leerer Zustand
	$:
	hasNoMatches = matches.length === 0;
	hasNoFields = fields.length === 0;
	
	// Filtere nur Spiele mit gültigen Feldern
	$:
	validMatches = matches.filter(m => getFieldById(m.fieldId));
</script>

<div class="field-grid-container">
	<!-- Header -->
	<div class="grid-header">
		<h3>
			<span class="material-symbols-outlined icon">sports_rugby</span>
			Spielfeld-Übersicht
		</h3>
		<div class="grid-controls">
			<button 
				class="control-button"
				on:click={toggleOrientation}
				aria-label={isHorizontal ? 'Vertikale Ansicht' : 'Horizontale Ansicht'}
				aria-pressed={isHorizontal}
			>
				<span class="material-symbols-outlined">
					{isHorizontal ? 'view_column' : 'view_row'}
				</span>
			</button>
			<button 
				class="control-button"
				on:click={zoomOut}
				aria-label="Verkleinern"
				disabled={zoomLevel <= 0.5}
			>
				<span class="material-symbols-outlined">zoom_out</span>
			</button>
			<button 
				class="control-button"
				on:click={zoomIn}
				aria-label="Vergößern"
				disabled={zoomLevel >= 2.0}
			>
				<span class="material-symbols-outlined">zoom_in</span>
			</button>
			<button 
				class="control-button"
				on:click={resetZoom}
				aria-label="Zoom zurücksetzen"
			>
				<span class="material-symbols-outlined">exposure_zero</span>
			</button>
			
			<span class="zoom-indicator">
				{Math.round(zoomLevel * 100)}%
			</span>
		</div>
	</div>
	
	<!-- Leerer Zustand -->
	{#if hasNoMatches || hasNoFields}
		<div class="empty-state">
			<span class="material-symbols-outlined empty-icon">sports_rugby</span>
			<p>
				{#if hasNoFields}
					Noch keine Spielfelder konfiguriert
				{:else if hasNoMatches}
					Noch kein Spielplan generiert
				{/if}
			</p>
			<p class="subtitle">
				{#if hasNoFields}
					Füge Spielfelder hinzu, um die Übersicht anzuzeigen
				{:else}
					Generiere einen Spielplan, um die Übersicht anzuzeigen
				{/if}
			</p>
		</div>
	{:else}
		<!-- Grid Container -->
		<div 
			class="zoom-container"
			bind:this={zoomContainer}
			class:horizontal={isHorizontal}
			on:wheel={handleWheel}
			style={`--zoom-level: ${zoomLevel}`}
		>
			<div 
				class="grid-wrapper"
				bind:this={gridContainer}
				class:horizontal={isHorizontal}
				style={`--zoom-level: ${zoomLevel}`}
			>
				<!-- Zeitachse (horizontal) oder Feldnamen (vertikal) -->
				<div class="axis-container">
					{#if !isHorizontal}
						<!-- Vertikale Anordnung: Zeitachse oben -->
						<div class="time-axis horizontal">
							{#each generateTimeMarkers(baseTime, timeSpanMinutes, isHorizontal) as time}
								<div class="time-marker" style={`left: ${time.position}%`}>
									<span class="time-label">{time.label}</span>
								</div>
							{/each}
						</div>
					{:else}
						<!-- Horizontale Anordnung: Feldnamen oben -->
						<div class="field-axis horizontal">
							<div class="axis-label">Spielfeld</div>
							{#each fieldList as field (field.id)}
								<div 
									class="field-label"
									style={`width: 150px; flex: 0 0 150px;`}
								>
									{field.name}
								</div>
							{/each}
						</div>
					{/if}
				</div>
				
				<!-- Feld-Spalten -->
				<div class="fields-container">
					{#each fieldList as field (field.id)}
						<div 
							class="field-column"
							class:horizontal={isHorizontal}
							style={`
								--field-color: ${getClubColor(field.id)};
								--num-matches: ${(fieldMatches[field.id] || []).length}
							`}
						>
							{#if !isHorizontal}
								<!-- Vertikale Anordnung: Feldname oben -->
								<div class="field-header vertical">
									<span class="material-symbols-outlined field-icon">sports_rugby</span>
									<span class="field-name">{field.name}</span>
									<span class="match-count">{fieldMatches[field.id]?.length || 0} Spiele</span>
								</div>
							{/if}
							
							<!-- Spiele in diesem Feld -->
							<div class="matches-container">
								{#each fieldMatches[field.id] || [] as match (match.id)}
									<div 
										class="match-block"
										class:derby={match.isDerby}
										class:repeat={match.isRepeat}
										class:has-conflicts={match.conflicts.length > 0}
										style={`
											--team-a-color: ${getClubColor(getTeamById(match.teamAId)?.clubId || '')};
											--team-b-color: ${getClubColor(getTeamById(match.teamBId)?.clubId || '')};
											--start-position: ${calculatePosition(new Date(match.startTime).getTime(), baseTime, timeSpanMinutes)}%;
											--duration: ${calculateDuration(new Date(match.startTime).getTime(), new Date(match.endTime).getTime(), timeSpanMinutes)}%;
											--zoom: ${zoomLevel}
										`}
										aria-label={`${getTeamById(match.teamAId)?.name || '?'} vs ${getTeamById(match.teamBId)?.name || '?'} auf ${field.name} von ${formatTime(match.startTime)} bis ${formatTime(match.endTime)}`}
									>
										<div class="match-content">
											<div class="team-name team-a">
												{getTeamById(match.teamAId)?.name || '?'}
											</div>
											<div class="match-vs">vs</div>
											<div class="team-name team-b">
												{getTeamById(match.teamBId)?.name || '?'}
											</div>
											<div class="match-time">
												{formatShortTime(match.startTime)} - {formatShortTime(match.endTime)}
											</div>
										</div>
										
										<!-- Konflikt-Marker -->
										{#if match.isDerby}
											<div class="conflict-marker derby">D</div>
										{/if}
										{#if match.isRepeat}
											<div class="conflict-marker repeat">W</div>
										{/if}
										
									</div>
								{/each}
								
								<!-- "Jetzt" Linie -->
								{#if nowLinePosition >= 0}
									<div 
										class="now-line"
										style={`left: ${nowLinePosition}%`}
										aria-label="Aktuelle Zeit"
									>
										<div class="now-label">Jetzt</div>
									</div>
								{/if}
							</div>
							
							{#if isHorizontal}
								<!-- Horizontale Anordnung: Feldname unten -->
								<div class="field-header horizontal">
									<span class="field-name">{field.name}</span>
									<span class="match-count">{fieldMatches[field.id]?.length || 0}</span>
								</div>
							{/if}
						</div>
					{/each}
					
					<!-- Zeitachse für horizontale Anordnung -->
					{#if isHorizontal}
						<div class="time-axis vertical">
							{#each generateTimeMarkers(baseTime, timeSpanMinutes, isHorizontal) as time}
								<div class="time-marker" style={`top: ${time.position}%`}>
									<span class="time-label">{time.label}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Helper Functions für Template -->
{#snippet generateTimeMarkers(baseTime: number, totalMinutes: number, isHorizontal: boolean)}
	{#each [0, 0.25, 0.5, 0.75, 1] as fraction}
		<span class="time-marker" style="left: {fraction * 100}%">
			{new Date(baseTime + (fraction * totalMinutes * 60 * 1000)).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
		</span>
	{/each}
{/snippet}

{#snippet calculatePosition(time: number, baseTime: number, totalMinutes: number)}
	{((time - baseTime) / (totalMinutes * 60 * 1000)) * 100}
{/snippet}

{#snippet calculateDuration(start: number, end: number, totalMinutes: number)}
	{((end - start) / (totalMinutes * 60 * 1000)) * 100}
{/snippet}

<style>
	.field-grid-container {
		width: 100%;
		background: var(--md-sys-color-surface-container, #fff);
		border-radius: var(--md-sys-shape-medium, 12px);
		box-shadow: var(--md-sys-shadow-level-1, 0 1px 3px rgba(0,0,0,0.1));
		overflow: hidden;
	}
	
	.grid-header {
		padding: 16px 20px;
		border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}
	
	.grid-header h3 {
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
	
	.grid-controls {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	
	.control-button {
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		border: none;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}
	
	.control-button:hover:not(:disabled) {
		background: var(--md-sys-color-surface-container-high, #e8e8e8);
	}
	
	.control-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.control-button span {
		font-size: 1.25rem;
		color: var(--md-sys-color-on-surface-variant, #666);
	}
	
	.zoom-indicator {
		background: var(--md-sys-color-primary-container, #e8dff4);
		color: var(--md-sys-color-on-primary-container, #21005e);
		padding: 4px 12px;
		border-radius: 16px;
		font-size: 0.8rem;
		font-weight: 600;
		margin-left: 8px;
	}
	
	.empty-state {
		text-align: center;
		padding: 48px 20px;
		color: var(--md-sys-color-on-surface-variant, #666);
	}
	
	.empty-state .empty-icon {
		font-size: 4rem;
		color: var(--md-sys-color-outline, #ccc);
		margin-bottom: 12px;
	}
	
	.empty-state p {
		margin: 0;
		font-size: 1rem;
	}
	
	.empty-state .subtitle {
		font-size: 0.875rem;
		color: var(--md-sys-color-on-surface-variant, #888);
		margin-top: 8px;
	}
	
	/* Zoom Container */
	.zoom-container {
		width: 100%;
		height: 600px;
		position: relative;
		overflow: auto;
		background: var(--md-sys-color-surface, #fff);
		transform-origin: center;
	}
	
	.zoom-container.horizontal {
		height: 400px;
		min-height: 400px;
	}
	
	.zoom-container::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}
	
	.zoom-container::-webkit-scrollbar-track {
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		border-radius: 4px;
	}
	
	.zoom-container::-webkit-scrollbar-thumb {
		background: var(--md-sys-color-outline-variant, #ccc);
		border-radius: 4px;
	}
	
	.zoom-container::-webkit-scrollbar-thumb:hover {
		background: var(--md-sys-color-outline, #aaa);
	}
	
	.grid-wrapper {
		position: relative;
		width: max-content;
		height: max-content;
		transform: scale(var(--zoom-level));
		transform-origin: center;
	}
	
	.grid-wrapper.horizontal {
		min-height: 300px;
	}
	
	/* Axis Container */
	.axis-container {
		position: absolute;
		z-index: 1;
	}
	
	.time-axis.horizontal {
		position: sticky;
		top: 0;
		background: var(--md-sys-color-surface, #fff);
		z-index: 2;
		display: flex;
		width: max-content;
		min-width: 100%;
		padding: 8px 0;
		border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
	}
	
	.field-axis.horizontal {
		position: sticky;
		top: 0;
		background: var(--md-sys-color-surface, #fff);
		z-index: 2;
		display: flex;
		width: max-content;
		min-width: 100%;
		padding: 8px 0;
		border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
	}
	
	.axis-label {
		width: 100px;
		flex: 0 0 100px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--md-sys-color-on-surface-variant, #666);
		padding: 8px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.field-label {
		width: 150px;
		flex: 0 0 150px;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface, #000);
		padding: 8px;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.time-marker {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--md-sys-color-outline, #ccc);
		left: 0;
	}
	
	.time-marker:last-child {
		width: 2px;
		background: var(--md-sys-color-primary, #6750a4);
	}
	
	.time-label {
		position: absolute;
		bottom: -20px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.7rem;
		color: var(--md-sys-color-on-surface-variant, #888);
		white-space: nowrap;
	}
	
	.time-axis.vertical {
		position: sticky;
		left: 0;
		background: var(--md-sys-color-surface, #fff);
		z-index: 2;
		display: flex;
		flex-direction: column;
		height: max-content;
		min-height: 100%;
		padding: 0 8px;
		border-right: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
	}
	
	.time-axis.vertical .time-marker {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--md-sys-color-outline, #ccc);
		top: 0;
	}
	
	.time-axis.vertical .time-label {
		position: absolute;
		left: -60px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.7rem;
		color: var(--md-sys-color-on-surface-variant, #888);
		white-space: nowrap;
		text-align: right;
	}
	
	/* Fields Container */
	.fields-container {
		position: relative;
		display: flex;
		gap: 12px;
		margin-top: 40px;
		padding-left: 100px;
	}
	
	.fields-container.horizontal {
		flex-direction: column;
		gap: 12px;
		margin-top: 0;
		margin-left: 150px;
		padding-top: 40px;
	}
	
	/* Field Column */
	.field-column {
		flex: 1;
		min-width: 200px;
		max-width: 250px;
		border-radius: var(--md-sys-shape-small, 8px);
		border: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
		overflow: hidden;
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		position: relative;
	}
	
	.field-column.horizontal {
		flex: none;
		width: 100%;
		max-width: none;
		min-height: 80px;
	}
	
	.field-header {
		padding: 8px 12px;
		background: var(--md-sys-color-surface-container-high, #e8e8e8);
		border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--md-sys-color-on-surface, #000);
	}
	
	.field-header.vertical {
		flex-direction: column;
		align-items: flex-start;
		padding: 12px;
	}
	
	.field-header.horizontal {
		flex-direction: row;
		align-items: center;
		padding: 4px 12px;
	}
	
	.field-icon {
		font-size: 1rem;
		color: var(--md-sys-color-primary, #6750a4);
	}
	
	.field-name {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.match-count {
		background: var(--md-sys-color-primary-container, #e8dff4);
		color: var(--md-sys-color-on-primary-container, #21005e);
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 0.7rem;
		font-weight: 600;
	}
	
	/* Matches Container */
	.matches-container {
		position: relative;
		padding: 8px;
		height: 400px;
		min-height: 300px;
		overflow: visible;
	}
	
	.field-column.horizontal .matches-container {
		padding: 4px;
		height: auto;
		min-height: 60px;
	}
	
	/* Match Block */
	.match-block {
		position: absolute;
		left: calc(var(--start-position) + 4px);
		top: 8px;
		width: calc(var(--duration) - 8px);
		min-width: 60px;
		min-height: 40px;
		background: linear-gradient(135deg, var(--team-a-color), var(--team-b-color));
		border-radius: var(--md-sys-shape-small, 8px);
		padding: 6px 8px;
		box-shadow: var(--md-sys-shadow-level-1, 0 1px 3px rgba(0,0,0,0.1));
		cursor: pointer;
		transition: all 0.2s ease;
		z-index: 1;
		transform: scale(var(--zoom));
		transform-origin: top left;
	}
	
	.match-block:hover {
		transform: scale(calc(var(--zoom) * 1.05));
		box-shadow: var(--md-sys-shadow-level-3, 0 4px 8px rgba(0,0,0,0.2));
		z-index: 10;
	}
	
	.match-block.derby {
		border: 2px solid var(--md-sys-color-error, #ff0000);
	}
	
	.match-block.repeat {
		border: 2px solid var(--md-sys-color-warning, #ff9800);
	}
	
	.match-block.has-conflicts {
		border: 2px dashed var(--md-sys-color-error, #ff0000);
	}
	
	.match-content {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		font-size: 0.65rem;
		color: white;
		text-align: center;
		text-shadow: 0 1px 2px rgba(0,0,0,0.5);
		line-height: 1.1;
		word-break: break-word;
	}
	
	.team-name {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}
	
	.match-vs {
		font-size: 0.8em;
		font-weight: 300;
		margin: 2px 0;
	}
	
	.match-time {
		font-size: 0.7em;
		opacity: 0.9;
		background: rgba(0,0,0,0.2);
		padding: 1px 4px;
		border-radius: 4px;
		margin-top: 2px;
	}
	
	/* Konflikt Marker */
	.conflict-marker {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		font-size: 0.6rem;
		font-weight: 700;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
	}
	
	.conflict-marker.derby {
		background: var(--md-sys-color-error, #ff0000);
	}
	
	.conflict-marker.repeat {
		background: var(--md-sys-color-warning, #ff9800);
	}
	
	/* Jetzt Linie -->
	.now-line {
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(var(--start-position) + 2px);
		width: 2px;
		background: var(--md-sys-color-primary, #6750a4);
		z-index: 3;
		pointer-events: none;
	}
	
	.now-label {
		position: absolute;
		top: -16px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--md-sys-color-primary, #6750a4);
		color: white;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 0.65rem;
		font-weight: 600;
		white-space: nowrap;
	}
	
	/* Responsive */
	@media (max-width: 1024px) {
		.zoom-container {
			height: 400px;
		}
		
		.zoom-container.horizontal {
			height: 300px;
		}
		
		.field-column {
			min-width: 150px;
			max-width: 200px;
		}
	}
	
	@media (max-width: 768px) {
		.zoom-container {
			height: 300px;
			min-height: 300px;
		}
		
		.zoom-container.horizontal {
			height: 250px;
		}
		
		.fields-container {
			gap: 6px;
		}
		
		.field-column {
			min-width: 120px;
			max-width: 150px;
		}
		
		.match-content {
			font-size: 0.6rem;
		}
		
		.match-block {
			min-height: 32px;
		}
		
		.match-time {
			display: none;
		}
	}
	
	@media (max-width: 480px) {
		.zoom-container {
			height: 250px;
		}
		
		.field-column {
			min-width: 100px;
			max-width: 120px;
		}
		
		.match-content {
			font-size: 0.55rem;
			gap: 1px;
		}
		
		.team-name {
			font-size: 0.55rem;
		}
		
		.match-vs {
			font-size: 0.7em;
		}
	}
</style>
