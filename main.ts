import { Plugin, Notice, WorkspaceLeaf } from 'obsidian';
import { AIRecordingView, AI_RECORDING_VIEW_TYPE } from './ai-recording-view';

export default class AIRecordingPlugin extends Plugin {
	sidebar: WorkspaceLeaf | null = null;
	recordingState: 'IDLE' | 'RECORDING' | 'PAUSED' | 'PROCESSING' | 'READY' | 'ERROR' = 'IDLE';
	recordingView: AIRecordingView | null = null;

	async onload() {
		console.log('Plugin AI Recording chargé');
		new Notice('Plugin AI Recording chargé avec succès');

		// Enregistrer la vue personnalisée
		this.registerView(AI_RECORDING_VIEW_TYPE, (leaf) => {
			this.recordingView = new AIRecordingView(leaf, this);
			return this.recordingView;
		});

		// Ajouter le bouton microphone dans le ribbon
		this.addRibbonIcon('mic', 'AI Recording', () => {
			this.toggleSidebar();
		});

		// Créer la sidebar au démarrage
		this.createSidebar();
	}

	onunload() {
		console.log('Plugin AI Recording déchargé');
		if (this.sidebar) {
			this.app.workspace.detachLeavesOfType(AI_RECORDING_VIEW_TYPE);
		}
	}

	async createSidebar() {
		const { workspace } = this.app;
		
		// Créer la sidebar si elle n'existe pas
		if (!this.sidebar) {
			this.sidebar = workspace.getRightLeaf(false);
			await this.sidebar.setViewState({
				type: AI_RECORDING_VIEW_TYPE,
				active: true,
			});
		}
	}

	toggleSidebar() {
		const { workspace } = this.app;
		
		if (this.sidebar) {
			workspace.detachLeavesOfType(AI_RECORDING_VIEW_TYPE);
			this.sidebar = null;
		} else {
			this.createSidebar();
		}
	}

	getRecordingState(): string {
		return this.recordingState;
	}

	setRecordingState(state: 'IDLE' | 'RECORDING' | 'PAUSED' | 'PROCESSING' | 'READY' | 'ERROR') {
		this.recordingState = state;
		this.updateSidebar();
	}

	updateSidebar() {
		// Mettre à jour l'affichage de la sidebar
		if (this.recordingView) {
			this.recordingView.updateDisplay();
		}
		console.log('État d\'enregistrement:', this.recordingState);
	}
}
