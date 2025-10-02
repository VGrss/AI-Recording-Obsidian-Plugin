import { ItemView, WorkspaceLeaf } from 'obsidian';

export const AI_RECORDING_VIEW_TYPE = 'ai-recording-sidebar';

export class AIRecordingView extends ItemView {
	plugin: any;
	containerEl: HTMLElement;
	controlZone: HTMLElement;
	historyZone: HTMLElement;
	stateIndicator: HTMLElement;
	timerDisplay: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: any) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return AI_RECORDING_VIEW_TYPE;
	}

	getDisplayText() {
		return 'AI Recording';
	}

	getIcon() {
		return 'mic';
	}

	async onOpen() {
		this.containerEl = this.contentEl;
		this.containerEl.empty();
		this.containerEl.addClass('ai-recording-sidebar');

		// Créer la structure de base
		this.createSidebarStructure();
		this.updateDisplay();
	}

	async onClose() {
		this.containerEl.empty();
	}

	createSidebarStructure() {
		// Zone de contrôle (en haut)
		this.controlZone = this.containerEl.createDiv('ai-recording-control-zone');
		
		// Titre
		const title = this.controlZone.createEl('h3', { text: 'AI Recording' });
		title.addClass('ai-recording-title');

		// Indicateur d'état
		this.stateIndicator = this.controlZone.createDiv('ai-recording-state');
		this.stateIndicator.textContent = 'IDLE';

		// Timer
		this.timerDisplay = this.controlZone.createDiv('ai-recording-timer');
		this.timerDisplay.textContent = '00:00';

		// Boutons de contrôle
		const buttonContainer = this.controlZone.createDiv('ai-recording-buttons');
		
		const startButton = buttonContainer.createEl('button', { text: 'Start' });
		startButton.addClass('ai-recording-btn', 'ai-recording-btn-primary');
		startButton.onclick = () => this.handleStartRecording();

		const pauseButton = buttonContainer.createEl('button', { text: 'Pause' });
		pauseButton.addClass('ai-recording-btn', 'ai-recording-btn-secondary');
		pauseButton.onclick = () => this.handlePauseRecording();

		const stopButton = buttonContainer.createEl('button', { text: 'Stop' });
		stopButton.addClass('ai-recording-btn', 'ai-recording-btn-danger');
		stopButton.onclick = () => this.handleStopRecording();

		// Zone d'historique (en bas)
		this.historyZone = this.containerEl.createDiv('ai-recording-history-zone');
		
		const historyTitle = this.historyZone.createEl('h4', { text: 'Historique' });
		historyTitle.addClass('ai-recording-history-title');

		const historyList = this.historyZone.createDiv('ai-recording-history-list');
		historyList.textContent = 'Aucun enregistrement pour le moment';

		// Ajouter les styles CSS
		this.addStyles();
	}

	addStyles() {
		const style = document.createElement('style');
		style.textContent = `
			.ai-recording-sidebar {
				padding: 16px;
				height: 100%;
				display: flex;
				flex-direction: column;
				gap: 16px;
			}

			.ai-recording-control-zone {
				background: var(--background-secondary);
				border-radius: 8px;
				padding: 16px;
				border: 1px solid var(--background-modifier-border);
			}

			.ai-recording-title {
				margin: 0 0 12px 0;
				color: var(--text-normal);
				font-size: 18px;
				font-weight: 600;
			}

			.ai-recording-state {
				font-size: 14px;
				font-weight: 500;
				margin-bottom: 8px;
				padding: 4px 8px;
				border-radius: 4px;
				background: var(--background-modifier-border);
				color: var(--text-muted);
				display: inline-block;
			}

			.ai-recording-state.recording {
				background: #ff6b6b;
				color: white;
			}

			.ai-recording-state.paused {
				background: #ffa726;
				color: white;
			}

			.ai-recording-state.processing {
				background: #42a5f5;
				color: white;
			}

			.ai-recording-timer {
				font-size: 24px;
				font-weight: bold;
				color: var(--text-normal);
				margin-bottom: 16px;
				font-family: monospace;
			}

			.ai-recording-buttons {
				display: flex;
				gap: 8px;
				flex-wrap: wrap;
			}

			.ai-recording-btn {
				padding: 8px 16px;
				border: none;
				border-radius: 6px;
				font-size: 14px;
				font-weight: 500;
				cursor: pointer;
				transition: all 0.2s ease;
			}

			.ai-recording-btn-primary {
				background: #4caf50;
				color: white;
			}

			.ai-recording-btn-primary:hover {
				background: #45a049;
			}

			.ai-recording-btn-secondary {
				background: #ff9800;
				color: white;
			}

			.ai-recording-btn-secondary:hover {
				background: #f57c00;
			}

			.ai-recording-btn-danger {
				background: #f44336;
				color: white;
			}

			.ai-recording-btn-danger:hover {
				background: #da190b;
			}

			.ai-recording-history-zone {
				flex: 1;
				background: var(--background-secondary);
				border-radius: 8px;
				padding: 16px;
				border: 1px solid var(--background-modifier-border);
				overflow-y: auto;
			}

			.ai-recording-history-title {
				margin: 0 0 12px 0;
				color: var(--text-normal);
				font-size: 16px;
				font-weight: 600;
			}

			.ai-recording-history-list {
				color: var(--text-muted);
				font-style: italic;
			}
		`;
		document.head.appendChild(style);
	}

	updateDisplay() {
		const state = this.plugin.getRecordingState();
		this.stateIndicator.textContent = state;
		this.stateIndicator.className = `ai-recording-state ${state.toLowerCase()}`;
	}

	handleStartRecording() {
		this.plugin.setRecordingState('RECORDING');
		this.updateDisplay();
	}

	handlePauseRecording() {
		this.plugin.setRecordingState('PAUSED');
		this.updateDisplay();
	}

	handleStopRecording() {
		this.plugin.setRecordingState('PROCESSING');
		this.updateDisplay();
		
		// Simuler le traitement
		setTimeout(() => {
			this.plugin.setRecordingState('READY');
			this.updateDisplay();
		}, 2000);
	}
}
