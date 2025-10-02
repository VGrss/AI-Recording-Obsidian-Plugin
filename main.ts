import { Plugin, Notice, WorkspaceLeaf, TFile } from 'obsidian';
import { AIRecordingView, AI_RECORDING_VIEW_TYPE } from './ai-recording-view';

export type RecordingState = 'IDLE' | 'RECORDING' | 'PAUSED' | 'FINISHED' | 'DELETED';

export interface RecordingMetadata {
	id: string;
	title: string;
	date: string;
	duration: number;
	status: 'pending' | 'processing' | 'completed' | 'error';
	audioFile?: string;
	transcriptFile?: string;
	summaryFile?: string;
	segments: Array<{start: number, end: number}>;
	createdAt: number;
	updatedAt: number;
}

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
	recordingsIndex: RecordingMetadata[] = [];
	recordingsFolder: string = 'AI Recordings';

	async onload() {
		console.log('Plugin AI Recording chargé');
		new Notice('Plugin AI Recording chargé avec succès');

		// Charger l'index des enregistrements
		await this.loadRecordingsIndex();

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

	async finishRecording() {
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
			
			// Sauvegarder l'enregistrement
			await this.saveRecording();
			
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

	async loadRecordingsIndex() {
		try {
			const indexFile = `${this.recordingsFolder}/recordings-index.json`;
			const file = this.app.vault.getAbstractFileByPath(indexFile);
			
			if (file && file instanceof TFile) {
				const content = await this.app.vault.read(file);
				this.recordingsIndex = JSON.parse(content);
			} else {
				this.recordingsIndex = [];
			}
		} catch (error) {
			console.error('Erreur lors du chargement de l\'index:', error);
			this.recordingsIndex = [];
		}
	}

	async saveRecordingsIndex() {
		try {
			// Créer le dossier s'il n'existe pas
			await this.ensureRecordingsFolder();
			
			const indexFile = `${this.recordingsFolder}/recordings-index.json`;
			const content = JSON.stringify(this.recordingsIndex, null, 2);
			
			const file = this.app.vault.getAbstractFileByPath(indexFile);
			if (file && file instanceof TFile) {
				await this.app.vault.modify(file, content);
			} else {
				await this.app.vault.create(indexFile, content);
			}
		} catch (error) {
			console.error('Erreur lors de la sauvegarde de l\'index:', error);
		}
	}

	async ensureRecordingsFolder() {
		const folder = this.app.vault.getAbstractFileByPath(this.recordingsFolder);
		if (!folder) {
			await this.app.vault.createFolder(this.recordingsFolder);
		}
	}

	async saveRecording() {
		if (!this.currentRecording || !this.currentRecording.audioBlob) {
			console.error('Aucun enregistrement à sauvegarder');
			return;
		}

		try {
			// Créer le dossier s'il n'existe pas
			await this.ensureRecordingsFolder();
			
			// Générer les noms de fichiers
			const date = new Date();
			const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
			const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
			const baseName = `Recording_${dateStr}_${timeStr}`;
			
			// Créer le dossier par date
			const dateFolder = `${this.recordingsFolder}/${dateStr}`;
			await this.ensureDateFolder(dateFolder);
			
			// Sauvegarder le fichier audio
			const audioFileName = `${baseName}.webm`;
			const audioPath = `${dateFolder}/${audioFileName}`;
			
			// Découper le fichier si nécessaire
			const audioBlobs = await this.chunkAudioIfNeeded(this.currentRecording.audioBlob);
			
			if (audioBlobs.length === 1) {
				// Fichier unique
				await this.app.vault.createBinary(audioPath, await audioBlobs[0].arrayBuffer());
			} else {
				// Fichiers multiples
				for (let i = 0; i < audioBlobs.length; i++) {
					const chunkPath = `${dateFolder}/${baseName}_part${i + 1}.webm`;
					await this.app.vault.createBinary(chunkPath, await audioBlobs[i].arrayBuffer());
				}
			}
			
			// Créer les métadonnées
			const metadata: RecordingMetadata = {
				id: this.currentRecording.id,
				title: `Enregistrement ${dateStr} ${timeStr}`,
				date: dateStr,
				duration: this.getRecordingDuration(),
				status: 'completed',
				audioFile: audioPath,
				segments: this.currentRecording.segments,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};
			
			// Ajouter à l'index
			this.recordingsIndex.unshift(metadata); // Ajouter au début (plus récent)
			
			// Sauvegarder l'index
			await this.saveRecordingsIndex();
			
			console.log('Enregistrement sauvegardé:', metadata);
			
		} catch (error) {
			console.error('Erreur lors de la sauvegarde:', error);
			new Notice('Erreur lors de la sauvegarde de l\'enregistrement');
		}
	}

	async ensureDateFolder(dateFolder: string) {
		const folder = this.app.vault.getAbstractFileByPath(dateFolder);
		if (!folder) {
			await this.app.vault.createFolder(dateFolder);
		}
	}

	async chunkAudioIfNeeded(audioBlob: Blob): Promise<Blob[]> {
		const maxSize = 25 * 1024 * 1024; // 25MB limite
		
		if (audioBlob.size <= maxSize) {
			return [audioBlob];
		}
		
		// Pour l'instant, on retourne le blob entier
		// TODO: Implémenter le découpage réel des fichiers audio
		console.warn('Fichier audio volumineux détecté:', audioBlob.size, 'bytes');
		return [audioBlob];
	}

	getRecordingsIndex(): RecordingMetadata[] {
		return this.recordingsIndex;
	}

	async deleteRecordingFromIndex(recordingId: string) {
		try {
			// Trouver l'enregistrement dans l'index
			const recordingIndex = this.recordingsIndex.findIndex(r => r.id === recordingId);
			if (recordingIndex === -1) {
				console.error('Enregistrement non trouvé:', recordingId);
				return;
			}
			
			const recording = this.recordingsIndex[recordingIndex];
			
			// Supprimer le fichier audio
			if (recording.audioFile) {
				const audioFile = this.app.vault.getAbstractFileByPath(recording.audioFile);
				if (audioFile) {
					await this.app.vault.delete(audioFile);
				}
			}
			
			// Supprimer de l'index
			this.recordingsIndex.splice(recordingIndex, 1);
			
			// Sauvegarder l'index mis à jour
			await this.saveRecordingsIndex();
			
			new Notice('Enregistrement supprimé');
			console.log('Enregistrement supprimé:', recordingId);
			
		} catch (error) {
			console.error('Erreur lors de la suppression:', error);
			new Notice('Erreur lors de la suppression de l\'enregistrement');
		}
	}

	updateSidebar() {
		// Mettre à jour l'affichage de la sidebar
		if (this.recordingView) {
			this.recordingView.updateDisplay();
		}
		console.log('État d\'enregistrement:', this.recordingState);
	}
}
