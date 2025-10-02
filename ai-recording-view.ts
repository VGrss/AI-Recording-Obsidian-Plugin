import { ItemView, WorkspaceLeaf } from 'obsidian';
import { RecordingState } from './main';

export const AI_RECORDING_VIEW_TYPE = 'ai-recording-sidebar';

export class AIRecordingView extends ItemView {
	plugin: any;
	containerEl: HTMLElement;
	controlZone: HTMLElement;
	historyZone: HTMLElement;
	stateIndicator: HTMLElement;
	timerDisplay: HTMLElement;
	buttonContainer: HTMLElement;
	timerInterval: NodeJS.Timeout | null = null;

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
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
		}
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
		this.buttonContainer = this.controlZone.createDiv('ai-recording-buttons');
		this.updateButtons();

		// Zone d'historique (en bas)
		this.historyZone = this.containerEl.createDiv('ai-recording-history-zone');
		
		const historyTitle = this.historyZone.createEl('h4', { text: 'Historique' });
		historyTitle.addClass('ai-recording-history-title');

		const historyList = this.historyZone.createDiv('ai-recording-history-list');
		historyList.textContent = 'Aucun enregistrement pour le moment';

		// Ajouter les styles CSS
		this.addStyles();
	}

	updateButtons() {
		this.buttonContainer.empty();
		const state = this.plugin.getRecordingState();

		switch (state) {
			case 'IDLE':
				this.createIdleButtons();
				break;
			case 'RECORDING':
				this.createRecordingButtons();
				break;
			case 'PAUSED':
				this.createPausedButtons();
				break;
			case 'FINISHED':
				this.createFinishedButtons();
				break;
		}
	}

	createIdleButtons() {
		const startButton = this.buttonContainer.createEl('button', { text: 'Commencer' });
		startButton.addClass('ai-recording-btn', 'ai-recording-btn-primary');
		startButton.onclick = async () => {
			// Vérifier les permissions avant de démarrer
			const hasPermission = await this.plugin.checkMicrophonePermissions();
			if (!hasPermission) {
				const granted = await this.plugin.requestMicrophoneAccess();
				if (!granted) {
					return;
				}
			}
			this.plugin.setRecordingState('RECORDING');
		};
	}

	createRecordingButtons() {
		const pauseButton = this.buttonContainer.createEl('button', { text: 'Pause' });
		pauseButton.addClass('ai-recording-btn', 'ai-recording-btn-secondary');
		pauseButton.onclick = () => this.plugin.setRecordingState('PAUSED');

		const finishButton = this.buttonContainer.createEl('button', { text: 'Terminer' });
		finishButton.addClass('ai-recording-btn', 'ai-recording-btn-success');
		finishButton.onclick = () => this.confirmFinishRecording();

		const stopButton = this.buttonContainer.createEl('button', { text: 'Stop & Supprimer' });
		stopButton.addClass('ai-recording-btn', 'ai-recording-btn-danger');
		stopButton.onclick = () => this.confirmDeleteRecording();
	}

	createPausedButtons() {
		const resumeButton = this.buttonContainer.createEl('button', { text: 'Reprendre' });
		resumeButton.addClass('ai-recording-btn', 'ai-recording-btn-primary');
		resumeButton.onclick = () => {
			this.plugin.resumeRecording();
			this.plugin.setRecordingState('RECORDING');
		};

		const finishButton = this.buttonContainer.createEl('button', { text: 'Terminer' });
		finishButton.addClass('ai-recording-btn', 'ai-recording-btn-success');
		finishButton.onclick = () => this.confirmFinishRecording();

		const stopButton = this.buttonContainer.createEl('button', { text: 'Stop & Supprimer' });
		stopButton.addClass('ai-recording-btn', 'ai-recording-btn-danger');
		stopButton.onclick = () => this.confirmDeleteRecording();
	}

	createFinishedButtons() {
		const newButton = this.buttonContainer.createEl('button', { text: 'Nouvel Enregistrement' });
		newButton.addClass('ai-recording-btn', 'ai-recording-btn-primary');
		newButton.onclick = () => this.plugin.setRecordingState('IDLE');
	}

	confirmFinishRecording() {
		const modal = document.createElement('div');
		modal.className = 'ai-recording-modal';
		modal.innerHTML = `
			<div class="ai-recording-modal-content">
				<h3>Terminer l'enregistrement</h3>
				<p>Êtes-vous sûr de vouloir terminer cet enregistrement ?</p>
				<p class="ai-recording-modal-note">L'enregistrement sera sauvegardé et prêt à être exploité.</p>
				<div class="ai-recording-modal-buttons">
					<button class="ai-recording-btn ai-recording-btn-success" id="confirm-finish">Terminer</button>
					<button class="ai-recording-btn ai-recording-btn-secondary" id="cancel-finish">Annuler</button>
				</div>
			</div>
		`;
		document.body.appendChild(modal);

		modal.querySelector('#confirm-finish')?.addEventListener('click', () => {
			this.plugin.setRecordingState('FINISHED');
			document.body.removeChild(modal);
		});

		modal.querySelector('#cancel-finish')?.addEventListener('click', () => {
			document.body.removeChild(modal);
		});
	}

	confirmDeleteRecording() {
		const modal = document.createElement('div');
		modal.className = 'ai-recording-modal';
		modal.innerHTML = `
			<div class="ai-recording-modal-content">
				<h3>Supprimer l'enregistrement</h3>
				<p>⚠️ Êtes-vous sûr de vouloir supprimer cet enregistrement ?</p>
				<p class="ai-recording-modal-warning">Cette action est irréversible et détruira toutes les données.</p>
				<div class="ai-recording-modal-buttons">
					<button class="ai-recording-btn ai-recording-btn-danger" id="confirm-delete">Supprimer</button>
					<button class="ai-recording-btn ai-recording-btn-secondary" id="cancel-delete">Annuler</button>
				</div>
			</div>
		`;
		document.body.appendChild(modal);

		modal.querySelector('#confirm-delete')?.addEventListener('click', () => {
			this.plugin.setRecordingState('DELETED');
			document.body.removeChild(modal);
		});

		modal.querySelector('#cancel-delete')?.addEventListener('click', () => {
			document.body.removeChild(modal);
		});
	}

	updateDisplay() {
		const state = this.plugin.getRecordingState();
		this.stateIndicator.textContent = state;
		this.stateIndicator.className = `ai-recording-state ${state.toLowerCase()}`;
		
		this.updateButtons();
		this.updateTimer();
	}

	updateTimer() {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
		}

		const state = this.plugin.getRecordingState();
		if (state === 'RECORDING' || state === 'PAUSED') {
			this.timerInterval = setInterval(() => {
				const duration = this.plugin.getRecordingDuration();
				const minutes = Math.floor(duration / 60000);
				const seconds = Math.floor((duration % 60000) / 1000);
				this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
			}, 1000);
		} else {
			this.timerDisplay.textContent = '00:00';
		}
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

			.ai-recording-state.finished {
				background: #4caf50;
				color: white;
			}

			.ai-recording-state.deleted {
				background: #f44336;
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

			.ai-recording-btn-success {
				background: #4caf50;
				color: white;
			}

			.ai-recording-btn-success:hover {
				background: #45a049;
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

			.ai-recording-modal {
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: rgba(0, 0, 0, 0.5);
				display: flex;
				justify-content: center;
				align-items: center;
				z-index: 1000;
			}

			.ai-recording-modal-content {
				background: var(--background-primary);
				border-radius: 8px;
				padding: 24px;
				max-width: 400px;
				width: 90%;
				border: 1px solid var(--background-modifier-border);
			}

			.ai-recording-modal-content h3 {
				margin: 0 0 16px 0;
				color: var(--text-normal);
			}

			.ai-recording-modal-content p {
				margin: 0 0 12px 0;
				color: var(--text-normal);
			}

			.ai-recording-modal-note {
				color: var(--text-muted);
				font-size: 14px;
			}

			.ai-recording-modal-warning {
				color: #ff6b6b;
				font-weight: 500;
			}

			.ai-recording-modal-buttons {
				display: flex;
				gap: 12px;
				justify-content: flex-end;
				margin-top: 20px;
			}
		`;
		document.head.appendChild(style);
	}
}
