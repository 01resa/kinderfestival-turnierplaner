<script lang="ts">
	/**
	 * MatchesTable - Tabellarische Darstellung der Spiele
	 * 
	 * Zeigt alle Spiele in einer Tabelle mit:
	 * - Runde
	 * - Uhrzeit
	 * - Feld
	 * - Teams
	 * - Markierungen (Derby, Wiederholung, Konflikte)
	 */
	
	import type { Match, Team, Club, Field } from '$lib/models/types';
	
	// Props
	interface Props {
		matches: Match[];
		teams: Team[];
		clubs: Club[];
		fields: Field[];
	}
	
	let { matches, teams, clubs, fields }: Props = $props();
	
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
	
	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString('de-DE', { 
			hour: '2-digit', 
			minute: '2-digit' 
		});
	}
	
	function formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString('de-DE', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	
	function getTeamColor(teamId: string): string {
		// Einfache Hash-Funktion für Farbe
		let hash = 0;
		for (let i = 0; i < teamId.length; i++) {
			hash = teamId.charCodeAt(i) + ((hash << 5) - hash);
		}
		
		const colors = [
			'#FF5722', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
			'#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
			'#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722'
		];
		
		return colors[Math.abs(hash) % colors.length];
	}
	
	function getClubColor(clubId: string): string {
		let hash = 0;
		for (let i = 0; i < clubId.length; i++) {
			hash = clubId.charCodeAt(i) + ((hash << 5) - hash);
		}
		
		const colors = [
			'#FF5722', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
			'#2196F3', '#03A9F4', '#00BCD4'
		];
		
		return colors[Math.abs(hash) % colors.length];
	}
	
	// Gruppiere Spiele nach Runde
	$:
	matchesByRound = matches.reduce((acc, match) => {
		if (!acc[match.round]) {
			acc[match.round] = [];
		}
		acc[match.round].push(match);
		return acc;
	}, {} as Record<number, Match[]>);
	
	// Sortierte Runden
	$:
	sortedRounds = Object.keys(matchesByRound)
		.map(Number)
		.sort((a, b) => a - b);
	
	// Gesamtstatistiken
	$:
	totalMatches = matches.length;
	$:
	derbyCount = matches.filter(m => m.isDerby).length;
	$:
	repeatCount = matches.filter(m => m.isRepeat).length;
	
	// Leerer Zustand
	$:
	hasNoMatches = matches.length === 0;
</script>

<div class="matches-table-container">
	<!-- Header -->
	<div class="table-header">
		<h3>Spiele</h3>
		<div class="table-stats">
			<span class="stat-badge">
				<span class="material-symbols-outlined icon">sports_soccer</span>
				{totalMatches} Spiele
			</span>
			{#if derbyCount > 0}
				<span class="stat-badge warning">
					<span class="material-symbols-outlined icon">warning</span>
					{derbyCount} Derbys
				</span>
			{/if}
			{#if repeatCount > 0}
				<span class="stat-badge warning">
					<span class="material-symbols-outlined icon">loop</span>
					{repeatCount} Wiederholungen
				</span>
			{/if}
		</div>
	</div>
	
	<!-- Leerer Zustand -->
	{#if hasNoMatches}
		<div class="empty-state">
			<span class="material-symbols-outlined empty-icon">sports_soccer</span>
			<p>Noch kein Spielplan generiert</p>
			<p class="subtitle">Generiere einen Spielplan, um Spiele anzuzeigen</p>
		</div>
	{:else}
		<!-- Tabellen-Container -->
		<div class="table-container">
			<!-- Runden-Tabs -->
			<div class="round-tabs">
				<button 
					class="round-tab"
					class:active={true}
					aria-label="Alle Runden"
				>
					Alle ({totalMatches})
				</button>
				{#each sortedRounds as round}
					<button 
						class="round-tab"
						aria-label={`Runde ${round}`}
					>
						Runde {round} ({matchesByRound[round].length})
					</button>
				{/each}
			</div>
			
			<!-- Tabelle -->
			<table class="matches-table">
				<thead>
					<tr>
						<th>Runde</th>
						<th>Uhrzeit</th>
						<th>Feld</th>
						<th>Team A</th>
						<th>Team B</th>
						<th>Konflikte</th>
					</tr>
				</thead>
				<tbody>
					{#each matches as match (match.id)}
						<tr class:derby={match.isDerby} class:repeat={match.isRepeat} class:has-conflicts={match.conflicts.length > 0}>
							<td class="round-cell">{match.round}</td>
							<td class="time-cell">{formatTime(match.startTime)} - {formatTime(match.endTime)}</td>
							<td class="field-cell">
								{getFieldById(match.fieldId)?.name || 'Unbekannt'}
							</td>
							<td class="team-cell">
								<div class="team-display">
									<div 
										class="team-color-box"
										style={`--team-color: ${getClubColor(getTeamById(match.teamAId)?.clubId || '')}`}
										aria-label="Vereinsfarbe"
									></div>
									<span>{getTeamById(match.teamAId)?.name || 'Unbekannt'}</span>
								</div>
							</td>
							<td class="team-cell">
								<div class="team-display">
									<div 
										class="team-color-box"
										style={`--team-color: ${getClubColor(getTeamById(match.teamBId)?.clubId || '')}`}
										aria-label="Vereinsfarbe"
									></div>
									<span>{getTeamById(match.teamBId)?.name || 'Unbekannt'}</span>
								</div>
							</td>
							<td class="conflict-cell">
								{#if match.isDerby}
									<span class="conflict-badge derby">Derby</span>
								{/if}
								{#if match.isRepeat}
									<span class="conflict-badge repeat">Wiederholung</span>
								{/if}
								{#if match.conflicts.length > 0 && !match.isDerby && !match.isRepeat}
									{#each match.conflicts as conflict}
										<span class="conflict-badge">
											{conflict.type === 'time_overlap' ? 'Zeit' : 
											conflict.type === 'field_overlap' ? 'Feld' : conflict.type}
										</span>
									{/each}
								{/if}
								{#if match.conflicts.length === 0 && !match.isDerby && !match.isRepeat}
									<span class="conflict-badge ok">OK</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.matches-table-container {
		width: 100%;
		background: var(--md-sys-color-surface-container, #fff);
		border-radius: var(--md-sys-shape-medium, 12px);
		box-shadow: var(--md-sys-shadow-level-1, 0 1px 3px rgba(0,0,0,0.1));
		overflow: hidden;
	}
	
	.table-header {
		padding: 16px 20px;
		border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
	}
	
	.table-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--md-sys-color-on-surface, #000);
		display: flex;
		align-items: center;
		gap: 8px;
	}
	
	.table-stats {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}
	
	.stat-badge {
		background: var(--md-sys-color-primary-container, #e8dff4);
		color: var(--md-sys-color-on-primary-container, #21005e);
		padding: 4px 12px;
		border-radius: 16px;
		font-size: 0.8rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 4px;
	}
	
	.stat-badge .icon {
		font-size: 1rem;
	}
	
	.stat-badge.warning {
		background: var(--md-sys-color-error-container, #ffdada);
		color: var(--md-sys-color-on-error-container, #5c0000);
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
	
	/* Table Container */
	.table-container {
		padding: 0 20px 20px 20px;
	}
	
	/* Round Tabs */
	.round-tabs {
		display: flex;
		gap: 4px;
		overflow-x: auto;
		padding-bottom: 12px;
		margin-bottom: 8px;
		border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}
	
	.round-tabs::-webkit-scrollbar {
		display: none;
	}
	
	.round-tab {
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		border: none;
		padding: 8px 16px;
		border-radius: 16px;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface-variant, #666);
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s ease;
	}
	
	.round-tab:hover {
		background: var(--md-sys-color-surface-container-high, #e8e8e8);
	}
	
	.round-tab.active {
		background: var(--md-sys-color-primary-container, #e8dff4);
		color: var(--md-sys-color-on-primary-container, #21005e);
	}
	
	/* Table */
	.matches-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	
	.matches-table th,
	.matches-table td {
		padding: 12px;
		text-align: left;
		border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
	}
	
	.matches-table th {
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		font-weight: 600;
		color: var(--md-sys-color-on-surface-variant, #666);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		position: sticky;
		top: 0;
	}
	
	.matches-table tr:last-child td {
		border-bottom: none;
	}
	
	.matches-table tr:hover td {
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
	}
	
	/* Cell Styles */
	.round-cell {
		font-weight: 600;
		color: var(--md-sys-color-primary, #6750a4);
		width: 60px;
		text-align: center;
	}
	
	.time-cell {
		font-family: monospace;
		color: var(--md-sys-color-on-surface-variant, #666);
		width: 120px;
	}
	
	.field-cell {
		color: var(--md-sys-color-on-surface, #000);
		width: 100px;
	}
	
	.team-cell {
		width: 200px;
	}
	
	.conflict-cell {
		width: 120px;
	}
	
	/* Team Display */
	.team-display {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	
	.team-color-box {
		width: 16px;
		height: 16px;
		border-radius: 4px;
		background: var(--team-color);
		flex-shrink: 0;
	}
	
	/* Conflict Badges */
	.conflict-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.25px;
		margin: 2px;
	}
	
	.conflict-badge.derby {
		background: var(--md-sys-color-error-container, #ffdada);
		color: var(--md-sys-color-on-error-container, #5c0000);
	}
	
	.conflict-badge.repeat {
		background: var(--md-sys-color-warning-container, #fff3d9);
		color: var(--md-sys-color-on-warning-container, #5c3d00);
	}
	
	.conflict-badge.ok {
		background: var(--md-sys-color-success-container, #d9f5dd);
		color: var(--md-sys-color-on-success-container, #004d00);
	}
	
	/* Row States */
	tr.derby td {
		background: rgba(255, 218, 218, 0.1);
	}
	
	tr.repeat td {
		background: rgba(255, 243, 217, 0.1);
	}
	
	tr.has-conflicts td {
		background: rgba(255, 218, 218, 0.05);
	}
	
	/* Responsive */
	@media (max-width: 768px) {
		.table-header {
			flex-direction: column;
			align-items: flex-start;
		}
		
		.table-stats {
			width: 100%;
			justify-content: flex-start;
		}
		
		.matches-table {
			font-size: 0.75rem;
		}
		
		.matches-table th,
		.matches-table td {
			padding: 8px 4px;
		}
		
		.round-cell,
		.time-cell,
		.field-cell,
		.team-cell,
		.conflict-cell {
			width: auto;
		}
		
		.team-display {
			flex-direction: column;
			align-items: flex-start;
			gap: 4px;
		}
		
		/* Alternative Darstellung für Mobile */
		.table-container {
			overflow-x: auto;
			padding-bottom: 0;
		}
		
		.matches-table {
			min-width: 700px;
		}
	}
	
	@media (max-width: 480px) {
		.round-tabs {
			flex-wrap: wrap;
		}
		
		.round-tab {
			flex: 1 0 auto;
		}
	}
</style>
