<script lang="ts">
	/**
	 * Tutorial Overlay - Geführter Einstiegs-Flow
	 * 
	 * Zeigt eine Schritt-für-Schritt-Anleitung für neue Benutzer.
	 */
	
	// Props
	interface Props {
		onClose: () => void;
	}
	
	let { onClose }: Props = $props();
	
	// Local State
	let currentStep = 1;
	let totalSteps = 6;
	
	// Tutorial Steps
	const steps = [
		{
			number: 1,
			title: 'Willkommen!',
			content: 'Dies ist der Kinderfestival Turnierplaner für F-Jugend-Teams (U7/U8). Mit dieser App kannst du einfach Turniere planen und verwalten.',
			image: 'sports_soccer'
		},
		{
			number: 2,
			title: 'Schritt 1: Vereine anlegen',
			content: 'Lege zuerst die teilnehmenden Vereine an. Jeder Verein kann mehrere Teams melden, die automatisch mit römischen Zahlen durchnummeriert werden.',
			image: 'group_add'
		},
		{
			number: 3,
			title: 'Schritt 2: Teams verwalten',
			content: 'Füge Teams zu den Vereinen hinzu. Die App vermeidet automatisch, dass Teams desselben Vereins gegeneinander spielen (Derbys).',
			image: 'sports_soccer'
		},
		{
			number: 4,
			title: 'Schritt 3: Turnier konfigurieren',
			content: 'Wähle die Anzahl der Spielrunden, Spieldauer, Pausen und Startzeit. Konfiguriere auch die verfügbaren Spielfelder.',
			image: 'settings'
		},
		{
			number: 5,
			title: 'Spielplan generieren',
			content: 'Klicke auf "Generieren", um einen optimalen Spielplan zu erstellen. Die App versucht, Derbys und Doppelbegegnungen zu vermeiden.',
			image: 'auto_awesome'
		},
		{
			number: 6,
			title: 'Spielplan anzeigen & exportieren',
			content: 'Betrachte den Spielplan in tabellarischer Form oder als grafische Übersicht. Exportiere ihn als JSON oder drucke ihn aus.',
			image: 'print'
		}
	];
	
	// Handlers
	function nextStep() {
		if (currentStep < totalSteps) {
			currentStep++;
		}
	}
	
	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}
	
	function goToStep(step: number) {
		currentStep = step;
	}
	
	function handleClose() {
		onClose();
	}
	
	// Current step data
	$:
	current = steps[currentStep - 1];
</script>

<div class="tutorial-overlay">
	<!-- Overlay Background -->
	<div class="overlay-background" on:click={handleClose}>
	</div>
	
	<!-- Tutorial Modal -->
	<div class="tutorial-modal md3-card">
		<!-- Close Button -->
		<button class="close-button" on:click={handleClose} aria-label="Tutorial schließen">
			<span class="material-symbols-outlined">close</span>
		</button>
		
		<!-- Step Indicator -->
		<div class="step-indicator-container">
			<div class="step-indicator">
				{#each Array(totalSteps) as _, i}
					<button 
						class="step-dot"
						class:active={i + 1 === currentStep}
						class:completed={i + 1 < currentStep}
						on:click={() => goToStep(i + 1)}
						aria-label={`Zu Schritt ${i + 1}`}
						aria-current={i + 1 === currentStep}
					></button>
				{/each}
			</div>
		</div>
		
		<!-- Step Content -->
		<div class="step-content">
			<div class="step-number">Schritt {currentStep} / {totalSteps}</div>
			
			<div class="step-icon">
				<span class="material-symbols-outlined">{current.image}</span>
			</div>
			
			<h2>{current.title}</h2>
			<p>{current.content}</p>
			
			<!-- Step Illustration -->
			<div class="step-illustration">
				{#if current.number === 1}
					<div class="illustration">
						<span class="material-symbols-outlined large">sports_soccer</span>
						<span class="material-symbols-outlined medium">group</span>
						<span class="material-symbols-outlined medium">settings</span>
					</div>
				{:else if current.number === 2}
					<div class="illustration">
						<div class="icon-stack">
							<span class="material-symbols-outlined">group_add</span>
							<span class="material-symbols-outlined small">sports_soccer</span>
							<span class="material-symbols-outlined small">sports_soccer</span>
						</div>
					</div>
				{:else if current.number === 3}
					<div class="illustration">
						<div class="team-list-preview">
							<div class="team-item">FC Musterhausen I</div>
							<div class="team-item">FC Musterhausen II</div>
							<div class="team-item">SV Beispiel III</div>
						</div>
					</div>
				{:else if current.number === 4}
					<div class="illustration">
						<div class="config-preview">
							<div class="config-item">Runden: 5</div>
							<div class="config-item">Spieldauer: 10 Min.</div>
							<div class="config-item">Pausen: 3 Min.</div>
						</div>
					</div>
				{:else if current.number === 5}
					<div class="illustration">
						<span class="material-symbols-outlined large">auto_awesome</span>
						<div class="match-preview">
							<div class="match-item">FC Musterhausen I vs SV Beispiel I</div>
							<div class="match-item">FC Musterhausen II vs SV Beispiel II</div>
						</div>
					</div>
				{:else}
					<div class="illustration">
						<span class="material-symbols-outlined large">print</span>
						<span class="material-symbols-outlined medium">download</span>
					</div>
				{/if}
			</div>
		</div>
		
		<!-- Navigation -->
		<div class="navigation">
			<button 
				class="nav-button"
				on:click={prevStep}
				disabled={currentStep === 1}
				aria-label="Zurück"
			>
				<span class="material-symbols-outlined">arrow_back</span>
				<span>Zurück</span>
			</button>
			
			{#if currentStep < totalSteps}
				<button 
					class="nav-button primary"
					on:click={nextStep}
					aria-label="Weiter"
				>
					<span>Weiter</span>
					<span class="material-symbols-outlined">arrow_forward</span>
				</button>
			{:else}
				<button 
					class="nav-button primary"
					on:click={handleClose}
					aria-label="Fertig"
				>
					<span>Fertig</span>
					<span class="material-symbols-outlined">check</span>
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.tutorial-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 3000;
		pointer-events: none;
	}
	
	.overlay-background {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		pointer-events: auto;
		animation: fadeIn 0.3s ease;
	}
	
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	
	.tutorial-modal {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 90%;
		max-width: 600px;
		max-height: 80vh;
		background: var(--md-sys-color-surface-container, #ffffff);
		border-radius: var(--md-sys-shape-large, 24px);
		box-shadow: var(--md-sys-shadow-level-4, 0 8px 32px rgba(0,0,0,0.3));
		padding: 32px;
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		gap: 20px;
		animation: slideIn 0.3s ease;
		
		/* Support for very small screens */
		max-height: 90vh;
		overflow-y: auto;
	}
	
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.9);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}
	
	.close-button {
		position: absolute;
		top: 12px;
		right: 12px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 8px;
		border-radius: 50%;
		color: var(--md-sys-color-on-surface-variant, #666);
		transition: all 0.2s ease;
		z-index: 1;
	}
	
	.close-button:hover {
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		color: var(--md-sys-color-on-surface, #000);
	}
	
	.close-button span {
		font-size: 1.5rem;
	}
	
	.step-indicator-container {
		text-align: center;
		padding: 0 20px;
	}
	
	.step-indicator {
		display: inline-flex;
		gap: 8px;
	}
	
	.step-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--md-sys-color-outline-variant, #e0e0e0);
		border: none;
		cursor: pointer;
		padding: 0;
		transition: all 0.2s ease;
	}
	
	.step-dot:hover {
		background: var(--md-sys-color-outline, #ccc);
	}
	
	.step-dot.active {
		background: var(--md-sys-color-primary, #6750a4);
		transform: scale(1.2);
	}
	
	.step-dot.completed {
		background: var(--md-sys-color-primary, #6750a4);
		opacity: 0.5;
	}
	
	.step-content {
		text-align: center;
		padding: 0 20px;
	}
	
	.step-number {
		font-size: 0.85rem;
		color: var(--md-sys-color-on-surface-variant, #666);
		margin-bottom: 8px;
	}
	
	.step-icon {
		width: 80px;
		height: 80px;
		margin: 0 auto 16px auto;
		background: var(--md-sys-color-primary-container, #e8dff4);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.step-icon span {
		font-size: 2.5rem;
		color: var(--md-sys-color-on-primary-container, #21005e);
	}
	
	.step-content h2 {
		margin: 0 0 12px 0;
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--md-sys-color-on-surface, #000);
	}
	
	.step-content p {
		margin: 0 0 20px 0;
		font-size: 0.95rem;
		color: var(--md-sys-color-on-surface-variant, #666);
		line-height: 1.6;
	}
	
	.step-illustration {
		margin: 20px 0;
		padding: 20px;
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		border-radius: var(--md-sys-shape-medium, 12px);
		min-height: 100px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	
	.illustration span.material-symbols-outlined {
		font-size: 2rem;
		color: var(--md-sys-color-primary, #6750a4);
	}
	
	.illustration span.material-symbols-outlined.large {
		font-size: 3rem;
	}
	
	.illustration span.material-symbols-outlined.medium {
		font-size: 2rem;
	}
	
	.illustration span.material-symbols-outlined.small {
		font-size: 1.5rem;
	}
	
	.icon-stack {
		position: relative;
		width: 60px;
		height: 60px;
	}
	
	.icon-stack span.material-symbols-outlined {
		position: absolute;
		font-size: 2rem;
	}
	
	.icon-stack span.material-symbols-outlined:first-child {
		top: 0;
		left: 0;
	}
	
	.icon-stack span.material-symbols-outlined:nth-child(2) {
		top: 10px;
		left: 20px;
		font-size: 1.5rem;
	}
	
	.icon-stack span.material-symbols-outlined:nth-child(3) {
		top: 20px;
		left: 0;
		font-size: 1.5rem;
	}
	
	.team-list-preview,
	.config-preview,
	.match-preview {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		max-width: 200px;
	}
	
	.team-item,
	.config-item,
	.match-item {
		background: var(--md-sys-color-surface, #fff);
		padding: 8px 12px;
		border-radius: var(--md-sys-shape-small, 8px);
		font-size: 0.8rem;
		color: var(--md-sys-color-on-surface, #000);
		box-shadow: var(--md-sys-shadow-level-1, 0 1px 2px rgba(0,0,0,0.1));
	}
	
	.config-item {
		background: var(--md-sys-color-primary-container, #e8dff4);
		color: var(--md-sys-color-on-primary-container, #21005e);
	}
	
	.navigation {
		display: flex;
		gap: 12px;
		justify-content: center;
		margin-top: 8px;
	}
	
	.nav-button {
		background: var(--md-sys-color-surface-container-highest, #f8f8f8);
		border: none;
		padding: 12px 24px;
		border-radius: var(--md-sys-shape-medium, 12px);
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface, #000);
		display: flex;
		align-items: center;
		gap: 8px;
		transition: all 0.2s ease;
	}
	
	.nav-button:hover:not(:disabled) {
		background: var(--md-sys-color-surface-container-high, #e8e8e8);
	}
	
	.nav-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.nav-button.primary {
		background: var(--md-sys-color-primary, #6750a4);
		color: var(--md-sys-color-on-primary, #ffffff);
	}
	
	.nav-button.primary:hover:not(:disabled) {
		background: var(--md-sys-color-primary, #5a4592);
	}
	
	.nav-button span.material-symbols-outlined {
		font-size: 1.1rem;
	}
	
	/* Responsive */
	@media (max-width: 600px) {
		.tutorial-modal {
			padding: 20px;
			margin: 20px;
			max-height: none;
			top: auto;
			left: auto;
			transform: none;
			bottom: auto;
			right: auto;
		}
		
		.step-icon {
			width: 60px;
			height: 60px;
		}
		
		.step-icon span {
			font-size: 2rem;
		}
		
		.step-content h2 {
			font-size: 1.2rem;
		}
		
		.step-content p {
			font-size: 0.85rem;
		}
		
		.step-illustration {
			padding: 12px;
			min-height: 80px;
		}
		
		.nav-button {
			padding: 10px 16px;
			font-size: 0.8rem;
		}
	}
	
	@media (max-width: 400px) {
		.tutorial-modal {
			padding: 16px;
		}
		
		.step-content h2 {
			font-size: 1rem;
		}
		
		.navigation {
			flex-direction: column;
		}
		
		.nav-button {
			width: 100%;
			justify-content: center;
		}
	}
</style>
