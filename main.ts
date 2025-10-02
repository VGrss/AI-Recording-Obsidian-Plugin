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
		audioBlob?: Blob;
		audioChunks: Blob[];
	} | null = null;
	mediaRecorder: MediaRecorder | null = null;
	audioStream: MediaStream | null = null;

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

	async startNewRecording() {
		try {
			// Demander les permissions microphone
			this.audioStream = await navigator.mediaDevices.getUserMedia({ 
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});

			// Créer le MediaRecorder
			this.mediaRecorder = new MediaRecorder(this.audioStream, {
				mimeType: 'audio/webm;codecs=opus'
			});

			// Initialiser l'enregistrement
			this.currentRecording = {
				id: `recording_${Date.now()}`,
				startTime: new Date(),
				pausedTime: 0,
				segments: [],
				audioChunks: []
			};

			// Configurer les événements MediaRecorder
			this.setupMediaRecorderEvents();

			// Démarrer l'enregistrement
			this.mediaRecorder.start();
			new Notice('Enregistrement démarré');
		} catch (error) {
			console.error('Erreur lors du démarrage de l\'enregistrement:', error);
			new Notice(`Erreur: ${error.message}`);
			this.setRecordingState('IDLE');
		}
	}

	setupMediaRecorderEvents() {
		if (!this.mediaRecorder) return;

		this.mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0 && this.currentRecording) {
				this.currentRecording.audioChunks.push(event.data);
			}
		};

		this.mediaRecorder.onstop = () => {
			if (this.currentRecording && this.currentRecording.audioChunks.length > 0) {
				this.currentRecording.audioBlob = new Blob(this.currentRecording.audioChunks, {
					type: 'audio/webm'
				});
				console.log('Audio blob créé:', this.currentRecording.audioBlob.size, 'bytes');
			}
		};

		this.mediaRecorder.onerror = (event) => {
			console.error('Erreur MediaRecorder:', event);
			new Notice('Erreur lors de l\'enregistrement audio');
			this.setRecordingState('IDLE');
		};
	}

	pauseRecording() {
		if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
			this.mediaRecorder.pause();
			
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
	}

	resumeRecording() {
		if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
			this.mediaRecorder.resume();
			
			if (this.currentRecording) {
				const now = new Date();
				this.currentRecording.pausedTime += now.getTime() - this.currentRecording.startTime.getTime();
			}
			new Notice('Enregistrement repris');
		}
	}

	finishRecording() {
		if (this.mediaRecorder && this.currentRecording) {
			// Arrêter l'enregistrement
			if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
				this.mediaRecorder.stop();
			}
			
			// Fermer le stream audio
			if (this.audioStream) {
				this.audioStream.getTracks().forEach(track => track.stop());
				this.audioStream = null;
			}
			
			// Marquer l'enregistrement comme terminé
			new Notice('Enregistrement terminé et sauvegardé');
			console.log('Enregistrement terminé:', this.currentRecording);
		}
	}

	deleteRecording() {
		if (this.mediaRecorder && this.currentRecording) {
			// Arrêter l'enregistrement
			if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
				this.mediaRecorder.stop();
			}
			
			// Fermer le stream audio
			if (this.audioStream) {
				this.audioStream.getTracks().forEach(track => track.stop());
				this.audioStream = null;
			}
			
			// Supprimer l'enregistrement
			new Notice('Enregistrement supprimé');
			console.log('Enregistrement supprimé');
		}
	}

	resetToIdle() {
		// Nettoyer les ressources
		if (this.mediaRecorder) {
			this.mediaRecorder = null;
		}
		if (this.audioStream) {
			this.audioStream.getTracks().forEach(track => track.stop());
			this.audioStream = null;
		}
		this.currentRecording = null;
	}

	getCurrentRecording() {
		return this.currentRecording;
	}

	async checkMicrophonePermissions(): Promise<boolean> {
		try {
			const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
			return result.state === 'granted';
		} catch (error) {
			console.warn('Impossible de vérifier les permissions microphone:', error);
			return false;
		}
	}

	async requestMicrophoneAccess(): Promise<boolean> {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			// Fermer immédiatement le stream de test
			stream.getTracks().forEach(track => track.stop());
			return true;
		} catch (error) {
			console.error('Accès microphone refusé:', error);
			new Notice('Accès au microphone refusé. Veuillez autoriser l\'accès dans les paramètres du navigateur.');
			return false;
		}
	}

	getRecordingDuration(): number {
		if (!this.currentRecording) return 0;
		
		const now = new Date();
		const elapsed = now.getTime() - this.currentRecording.startTime.getTime() - this.currentRecording.pausedTime;
		return Math.max(0, elapsed);
	}

	updateSidebar() {
		// Mettre à jour l'affichage de la sidebar
		if (this.recordingView) {
			this.recordingView.updateDisplay();
		}
		console.log('État d\'enregistrement:', this.recordingState);
	}
}
