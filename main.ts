import { Plugin, Notice, WorkspaceLeaf } from 'obsidian';
import { AIRecordingView, AI_RECORDING_VIEW_TYPE } from './ai-recording-view';

export type RecordingState = 'IDLE' | 'RECORDING' | 'PAUSED' | 'FINISHED' | 'DELETED';

export default class AIRecordingPlugin extends Plugin {
	sidebar: WorkspaceLeaf | null = null;
	recordingState: RecordingState = 'IDLE';
	recordingView: AIRecordingView | null = null;
	currentRecording: {
		id: string;
		startTime: Date;
		pausedTime: number;
		segments: Array<{start: number, end: number}>;
	} | null = null;

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

	getRecordingState(): RecordingState {
		return this.recordingState;
	}

	setRecordingState(state: RecordingState) {
		const previousState = this.recordingState;
		this.recordingState = state;
		
		// Gérer les transitions d'états
		this.handleStateTransition(previousState, state);
		this.updateSidebar();
	}

	handleStateTransition(from: RecordingState, to: RecordingState) {
		console.log(`Transition d'état: ${from} → ${to}`);
		
		switch (to) {
			case 'RECORDING':
				this.startNewRecording();
				break;
			case 'PAUSED':
				this.pauseRecording();
				break;
			case 'FINISHED':
				this.finishRecording();
				break;
			case 'DELETED':
				this.deleteRecording();
				break;
			case 'IDLE':
				this.resetToIdle();
				break;
		}
	}

	startNewRecording() {
		this.currentRecording = {
			id: `recording_${Date.now()}`,
			startTime: new Date(),
			pausedTime: 0,
			segments: []
		};
		new Notice('Enregistrement démarré');
	}

	pauseRecording() {
		if (this.currentRecording) {
			const now = new Date();
			const segmentStart = new Date(this.currentRecording.startTime.getTime() + this.currentRecording.pausedTime);
			this.currentRecording.segments.push({
				start: segmentStart.getTime(),
				end: now.getTime()
			});
		}
		new Notice('Enregistrement en pause');
	}

	resumeRecording() {
		if (this.currentRecording) {
			const now = new Date();
			this.currentRecording.pausedTime += now.getTime() - this.currentRecording.startTime.getTime();
		}
		new Notice('Enregistrement repris');
	}

	finishRecording() {
		if (this.currentRecording) {
			// Marquer l'enregistrement comme terminé
			new Notice('Enregistrement terminé et sauvegardé');
			this.currentRecording = null;
		}
	}

	deleteRecording() {
		if (this.currentRecording) {
			// Supprimer l'enregistrement
			new Notice('Enregistrement supprimé');
			this.currentRecording = null;
		}
	}

	resetToIdle() {
		this.currentRecording = null;
	}

	getCurrentRecording() {
		return this.currentRecording;
	}

	updateSidebar() {
		// Mettre à jour l'affichage de la sidebar
		if (this.recordingView) {
			this.recordingView.updateDisplay();
		}
		console.log('État d\'enregistrement:', this.recordingState);
	}
}
