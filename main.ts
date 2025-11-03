import { Plugin, Notice, WorkspaceLeaf, TFile } from 'obsidian';
import { AIRecordingView, AI_RECORDING_VIEW_TYPE } from './ai-recording-view';
import { AIRecordingSettings, DEFAULT_SETTINGS, AIRecordingSettingTab } from './settings';
import { TranscriptionService } from './transcription-service';
import { SummaryService } from './summary-service';

export type RecordingState = 'IDLE' | 'RECORDING' | 'PAUSED' | 'FINISHED' | 'DELETED' | 'UPLOADING' | 'TRANSCRIBING' | 'SUMMARIZING';

export interface RecordingMetadata {
	id: string;
	title: string;
	date: string;
	duration: number;
	status: 'pending' | 'processing' | 'completed' | 'error' | string; // NOUVEAU v0.9.9 : Permet les statuts dynamiques comme 'processing_chunk_X_Y'
	audioFile?: string;
	audioChunks?: string[]; // NOUVEAU v0.9.8 : Chemins des chunks temporaires
	transcriptFile?: string;
	summaryFile?: string;
	segments: Array<{start: number, end: number}>;
	createdAt: number;
	updatedAt: number;
}

export default class AIRecordingPlugin extends Plugin {
	settings: AIRecordingSettings;
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
		// NOUVEAU v0.9.10 : Taille en temps réel et avertissement
		currentSize: number;
		sizeWarningShown: boolean;
	} | null = null;
	mediaRecorder: MediaRecorder | null = null;
	audioStream: MediaStream | null = null;
	recordingsIndex: RecordingMetadata[] = [];
	recordingsFolder: string = 'AI Recordings';
	transcriptionService: TranscriptionService;
	summaryService: SummaryService;

	async onload() {
		console.log('Plugin AI Recording chargé');
		
		// Charger les paramètres
		await this.loadSettings();
		
		// Mettre à jour le dossier d'enregistrements depuis les paramètres
		this.recordingsFolder = this.settings.recordingsFolder;
		
		// Initialiser les services
		this.transcriptionService = new TranscriptionService();
		this.summaryService = new SummaryService();
		
		new Notice('Plugin AI Recording chargé avec succès');

		// Enregistrer la vue personnalisée
		this.registerView(AI_RECORDING_VIEW_TYPE, (leaf) => {
			this.recordingView = new AIRecordingView(leaf, this);
			return this.recordingView;
		});

		// Ajouter le bouton microphone dans le ribbon
		this.addRibbonIcon('mic', 'AI Recording', async () => {
			await this.toggleSidebar();
		});

		// Ajouter l'onglet de paramètres
		this.addSettingTab(new AIRecordingSettingTab(this.app, this));

		// Ajouter les commandes avec raccourcis clavier
		this.registerCommands();

		// Charger l'index des enregistrements après que le workspace soit prêt
		this.app.workspace.onLayoutReady(() => {
			console.log('Workspace ready, loading recordings index...');
			this.loadRecordingsIndex();
		});
	}

	registerCommands() {
		// Commande : Toggle Sidebar
		this.addCommand({
			id: 'toggle-sidebar',
			name: 'Ouvrir/Fermer la sidebar AI Recording',
			callback: async () => {
				await this.toggleSidebar();
			}
		});

		// Commande : Start Recording
		this.addCommand({
			id: 'start-recording',
			name: 'Démarrer un enregistrement',
			callback: async () => {
				if (this.recordingState === 'IDLE') {
					const hasPermission = await this.checkMicrophonePermissions();
					if (!hasPermission) {
						const granted = await this.requestMicrophoneAccess();
						if (!granted) return;
					}
					this.setRecordingState('RECORDING');
					new Notice('Enregistrement démarré');
				} else {
					new Notice('Un enregistrement est déjà en cours');
				}
			}
		});

		// Commande : Stop Recording
		this.addCommand({
			id: 'stop-recording',
			name: 'Terminer l\'enregistrement en cours',
			callback: () => {
				if (this.recordingState === 'RECORDING' || this.recordingState === 'PAUSED') {
					this.setRecordingState('FINISHED');
					new Notice('Enregistrement terminé');
				} else {
					new Notice('Aucun enregistrement en cours');
				}
			}
		});

		// Commande : Pause/Resume Recording
		this.addCommand({
			id: 'pause-resume-recording',
			name: 'Pause/Reprendre l\'enregistrement',
			callback: () => {
				if (this.recordingState === 'RECORDING') {
					this.setRecordingState('PAUSED');
					new Notice('Enregistrement en pause');
				} else if (this.recordingState === 'PAUSED') {
					this.resumeRecording();
					this.setRecordingState('RECORDING');
					new Notice('Enregistrement repris');
				} else {
					new Notice('Aucun enregistrement en cours');
				}
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Mettre à jour le dossier d'enregistrements si changé
		this.recordingsFolder = this.settings.recordingsFolder;
	}

	onunload() {
		console.log('Plugin AI Recording déchargé');
		if (this.sidebar) {
			this.app.workspace.detachLeavesOfType(AI_RECORDING_VIEW_TYPE);
		}
	}

	async createSidebar() {
		const { workspace } = this.app;
		
		// Vérifier l'état de la sidebar droite et l'ouvrir si nécessaire
		// @ts-ignore
		const isRightSidebarCollapsed = workspace.rightSplit?.collapsed;
		
		if (isRightSidebarCollapsed) {
			// Ouvrir la sidebar droite si elle est fermée
			// @ts-ignore
			this.app.commands.executeCommandById('app:toggle-right-sidebar');
			// Petit délai pour laisser la sidebar s'ouvrir
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		
		// Vérifier si une vue existe déjà
		const existing = workspace.getLeavesOfType(AI_RECORDING_VIEW_TYPE);
		
		if (existing.length > 0) {
			workspace.revealLeaf(existing[0]);
			this.sidebar = existing[0];
			return;
		}
		
		// Créer dans la sidebar droite
		const leaf = workspace.getRightLeaf(false);
		
		if (leaf) {
			await leaf.setViewState({
				type: AI_RECORDING_VIEW_TYPE,
				active: true,
			});
			workspace.revealLeaf(leaf);
			this.sidebar = leaf;
		}
	}

	async toggleSidebar() {
		await this.createSidebar();
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
				audioChunks: [],
				// NOUVEAU v0.9.10 : Initialiser la taille et l'avertissement
				currentSize: 0,
				sizeWarningShown: false
			};

			// Configurer les événements MediaRecorder
			this.setupMediaRecorderEvents();

			// NOUVEAU v0.9.10 : Démarrer l'enregistrement avec timeslice pour détection précoce
			// Émettre un événement dataavailable toutes les 2 secondes pour suivre la taille
			this.mediaRecorder.start(2000);
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
				
				// NOUVEAU v0.9.10 : Mettre à jour la taille en temps réel
				this.currentRecording.currentSize += event.data.size;
				this.updateRecordingSize();
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
			// Créer une Promise qui attend que le blob soit créé
			const blobReady = new Promise<void>((resolve) => {
				if (this.mediaRecorder) {
					this.mediaRecorder.addEventListener('stop', () => {
						// Attendre un peu pour s'assurer que onstop a fini
						setTimeout(() => resolve(), 100);
					}, { once: true });
				}
			});
			
			// Arrêter l'enregistrement
			if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
				this.mediaRecorder.stop();
			}
			
			// Attendre que le blob soit créé
			await blobReady;
			
			// Fermer le stream audio
			if (this.audioStream) {
				this.audioStream.getTracks().forEach(track => track.stop());
				this.audioStream = null;
			}
			
			// Sauvegarder l'enregistrement
			const recordingId = await this.saveRecording();
			
			// Rafraîchir l'historique après sauvegarde
			this.updateSidebar();
			
			// Marquer l'enregistrement comme terminé
			new Notice('Enregistrement terminé et sauvegardé');
			console.log('Enregistrement terminé:', this.currentRecording);
			
			// NOUVEAU : Retourner immédiatement à IDLE pour libérer les contrôles
			this.setRecordingState('IDLE');
			
			// Démarrer le traitement asynchrone (transcription + résumé) en arrière-plan
			if (recordingId && this.settings.transcriptionProvider === 'openai') {
				// Lancer le traitement de manière asynchrone sans bloquer
				this.processRecording(recordingId).catch(error => {
					console.error('Erreur lors du traitement de l\'enregistrement:', error);
				});
			}
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
			
			// Revenir automatiquement à IDLE pour permettre un nouvel enregistrement
			setTimeout(() => {
				this.setRecordingState('IDLE');
			}, 500); // Petit délai pour que l'utilisateur voie le message de suppression
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

	/**
	 * NOUVEAU v0.9.10 : Met à jour la taille en temps réel et avertit si nécessaire
	 */
	updateRecordingSize() {
		if (!this.currentRecording || !this.recordingView) return;

		const maxSize = 25 * 1024 * 1024; // 25 MB
		const warningThreshold = 20 * 1024 * 1024; // 20 MB (80% de la limite)
		const sizeMB = this.currentRecording.currentSize / (1024 * 1024);

		// Mettre à jour l'affichage de la taille dans l'interface
		this.recordingView.updateSizeDisplay(sizeMB);

		// Avertir l'utilisateur si la taille approche de la limite
		if (sizeMB >= 20 && !this.currentRecording.sizeWarningShown) {
			this.currentRecording.sizeWarningShown = true;
			new Notice(`⚠️ Taille du fichier: ${sizeMB.toFixed(2)} MB. Le découpage automatique sera activé si > 25 MB.`);
		}

		// Avertir si la limite est dépassée (ne devrait pas arriver normalement, mais sécurité)
		if (this.currentRecording.currentSize > maxSize) {
			new Notice(`⚠️ Fichier volumineux détecté (${sizeMB.toFixed(2)} MB). Le découpage automatique sera activé.`);
		}
	}

	/**
	 * NOUVEAU v0.9.10 : Obtient la taille actuelle de l'enregistrement en MB
	 */
	getRecordingSize(): number {
		if (!this.currentRecording) return 0;
		return this.currentRecording.currentSize / (1024 * 1024);
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
			console.log('Loading recordings index from:', indexFile);
			
			const file = this.app.vault.getAbstractFileByPath(indexFile);
			
			if (file && file instanceof TFile) {
				const content = await this.app.vault.read(file);
				this.recordingsIndex = JSON.parse(content);
				console.log('Recordings index loaded successfully:', this.recordingsIndex.length, 'recordings');
			} else {
				console.log('Index file not found, rebuilding from audio files...');
				await this.rebuildRecordingsIndex();
			}
			
			// Mettre à jour l'affichage si la vue est ouverte
			this.updateSidebar();
		} catch (error) {
			console.error('Erreur lors du chargement de l\'index:', error);
			this.recordingsIndex = [];
		}
	}

	async rebuildRecordingsIndex() {
		try {
			// Trouver tous les fichiers audio dans le dossier d'enregistrements
			const allFiles = this.app.vault.getFiles();
			console.log('Total files in vault:', allFiles.length);
			
			const audioFiles = allFiles.filter(f => 
				f.path.startsWith(this.recordingsFolder) && 
				f.path.endsWith('.webm')
			);
			
			console.log('Found audio files:', audioFiles.length);
			
			// Créer des entrées d'index pour chaque fichier audio
			this.recordingsIndex = audioFiles.map(file => {
				const fileName = file.name.replace('.webm', '');
				const match = fileName.match(/Recording_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
				
				let date = new Date().toISOString().split('T')[0];
				let title = fileName;
				
				if (match) {
					date = match[1];
					title = `Enregistrement ${match[1]} ${match[2]}`;
				}
				
				return {
					id: `recording_${file.stat.ctime}`,
					title: title,
					date: date,
					duration: 0,
					status: 'completed' as const,
					audioFile: file.path,
					segments: [] as Array<{start: number, end: number}>,
					createdAt: file.stat.ctime,
					updatedAt: file.stat.mtime
				};
			});
			
			// Trier du plus récent au plus ancien
			this.recordingsIndex.sort((a, b) => b.createdAt - a.createdAt);
			
			console.log('Rebuilt index with', this.recordingsIndex.length, 'recordings');
			
			// Sauvegarder l'index via l'API Obsidian
			if (this.recordingsIndex.length > 0) {
				await this.saveRecordingsIndex();
			}
		} catch (error) {
			console.error('Erreur lors de la reconstruction de l\'index:', error);
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

	async saveRecording(): Promise<string | null> {
		if (!this.currentRecording || !this.currentRecording.audioBlob) {
			console.error('Aucun enregistrement à sauvegarder');
			return null;
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
			
			// NOUVEAU v0.9.8 : Sauvegarder le fichier original complet
			await this.app.vault.createBinary(audioPath, await this.currentRecording.audioBlob!.arrayBuffer());
			
			// Découper le fichier si nécessaire pour transcription (chunks temporaires)
			const audioBlobs = await this.chunkAudioIfNeeded(this.currentRecording.audioBlob!);
			
			let audioChunks: string[] = [];
			
			if (audioBlobs.length > 1) {
				// NOUVEAU v0.9.8 : Fichier volumineux - créer des chunks temporaires pour transcription
				// Le fichier original complet est déjà sauvegardé ci-dessus
				// Sauvegarder les chunks temporaires uniquement pour transcription
				for (let i = 0; i < audioBlobs.length; i++) {
					const chunkPath = `${dateFolder}/${baseName}_chunk${i + 1}.webm`;
					await this.app.vault.createBinary(chunkPath, await audioBlobs[i].arrayBuffer());
					audioChunks.push(chunkPath);
					console.log(`Chunk ${i + 1} sauvegardé: ${chunkPath} (${(audioBlobs[i].size / 1024 / 1024).toFixed(2)} MB)`);
				}
				
				new Notice(`Fichier volumineux détecté: ${audioBlobs.length} chunks créés pour transcription`);
			}
			
			// Créer les métadonnées
			const metadata: RecordingMetadata = {
				id: this.currentRecording.id,
				title: `Enregistrement ${dateStr} ${timeStr}`,
				date: dateStr,
				duration: this.getRecordingDuration(),
				status: 'completed',
				audioFile: audioPath,
				audioChunks: audioChunks.length > 0 ? audioChunks : undefined, // NOUVEAU v0.9.8
				segments: this.currentRecording.segments,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};
			
			// Ajouter à l'index
			this.recordingsIndex.unshift(metadata); // Ajouter au début (plus récent)
			
			// Sauvegarder l'index
			await this.saveRecordingsIndex();
			
			console.log('Enregistrement sauvegardé:', metadata);
			
			return this.currentRecording.id;
			
		} catch (error) {
			console.error('Erreur lors de la sauvegarde:', error);
			new Notice('Erreur lors de la sauvegarde de l\'enregistrement');
			return null;
		}
	}

	async ensureDateFolder(dateFolder: string) {
		const folder = this.app.vault.getAbstractFileByPath(dateFolder);
		if (!folder) {
			await this.app.vault.createFolder(dateFolder);
		}
	}

	/**
	 * NOUVEAU v0.9.8 : Découpe un fichier audio volumineux en chunks de moins de 25 MB
	 * @param audioBlob Le blob audio à découper
	 * @returns Array de blobs audio valides de moins de 25 MB chacun
	 */
	async chunkAudioIfNeeded(audioBlob: Blob): Promise<Blob[]> {
		const maxSize = 25 * 1024 * 1024; // 25MB limite
		
		if (audioBlob.size <= maxSize) {
			return [audioBlob];
		}
		
		console.log(`Fichier audio volumineux détecté: ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB`);
		console.log('Démarrage du découpage automatique...');
		
		try {
			// Découper le fichier audio en chunks
			const chunks = await this.splitAudioIntoChunks(audioBlob, maxSize);
			console.log(`Fichier découpé en ${chunks.length} chunks`);
			
			// Vérifier que chaque chunk est valide
			for (let i = 0; i < chunks.length; i++) {
				const chunkSize = chunks[i].size;
				if (chunkSize > maxSize) {
					console.warn(`Chunk ${i + 1} dépasse encore la limite: ${(chunkSize / 1024 / 1024).toFixed(2)} MB`);
				}
			}
			
			return chunks;
		} catch (error) {
			console.error('Erreur lors du découpage du fichier audio:', error);
			new Notice('Erreur lors du découpage du fichier audio. Tentative de transcription du fichier complet...');
			// En cas d'erreur, retourner le blob entier (l'API échouera mais au moins on essaie)
			return [audioBlob];
		}
	}

	/**
	 * NOUVEAU v0.9.8 : Découpe un fichier audio en chunks de moins de maxSize
	 * @param audioBlob Le blob audio à découper
	 * @param maxSize Taille maximale par chunk en bytes
	 * @returns Array de blobs audio valides
	 */
	async splitAudioIntoChunks(audioBlob: Blob, maxSize: number): Promise<Blob[]> {
		try {
			// Créer un contexte audio
			const audioContext = new AudioContext();
			
			// Décoder le fichier audio
			const arrayBuffer = await audioBlob.arrayBuffer();
			const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
			
			console.log(`Audio décodé: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} canaux, ${audioBuffer.sampleRate}Hz`);
			
			// Calculer la durée par chunk en secondes (approximation basée sur la taille)
			// Estimation: 1 MB ≈ 1 minute d'audio WebM (approximation)
			const estimatedBitrate = audioBlob.size / audioBuffer.duration; // bytes par seconde
			const durationPerChunk = maxSize / estimatedBitrate; // secondes par chunk
			
			// S'assurer qu'on ne dépasse pas la durée totale
			const chunkDuration = Math.min(durationPerChunk, audioBuffer.duration);
			
			// Calculer le nombre de chunks nécessaires
			const numberOfChunks = Math.ceil(audioBuffer.duration / chunkDuration);
			
			console.log(`Découpage estimé: ${numberOfChunks} chunks de ~${chunkDuration.toFixed(2)}s chacun`);
			
			const chunks: Blob[] = [];
			
			// Créer chaque chunk
			for (let i = 0; i < numberOfChunks; i++) {
				const startTime = i * chunkDuration;
				const endTime = Math.min((i + 1) * chunkDuration, audioBuffer.duration);
				
				console.log(`Création du chunk ${i + 1}/${numberOfChunks}: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
				
				// Extraire le segment audio
				const chunkBuffer = await this.extractAudioSegment(audioBuffer, startTime, endTime, audioContext);
				
				// Encoder le segment en WebM
				const chunkBlob = await this.encodeAudioToWebM(chunkBuffer, audioContext);
				
				// Vérifier la taille
				if (chunkBlob.size > maxSize) {
					console.warn(`Chunk ${i + 1} trop volumineux: ${(chunkBlob.size / 1024 / 1024).toFixed(2)} MB, division en deux...`);
					// Si le chunk est encore trop gros, on le divise en deux
					const halfDuration = (endTime - startTime) / 2;
					const midTime = startTime + halfDuration;
					
					// Premier sous-chunk
					const chunk1Buffer = await this.extractAudioSegment(audioBuffer, startTime, midTime, audioContext);
					const chunk1Blob = await this.encodeAudioToWebM(chunk1Buffer, audioContext);
					chunks.push(chunk1Blob);
					
					// Deuxième sous-chunk
					const chunk2Buffer = await this.extractAudioSegment(audioBuffer, midTime, endTime, audioContext);
					const chunk2Blob = await this.encodeAudioToWebM(chunk2Buffer, audioContext);
					chunks.push(chunk2Blob);
				} else {
					chunks.push(chunkBlob);
				}
			}
			
			// Fermer le contexte audio
			await audioContext.close();
			
			console.log(`Découpage terminé: ${chunks.length} chunks créés`);
			return chunks;
			
		} catch (error) {
			console.error('Erreur lors du découpage:', error);
			throw error;
		}
	}

	/**
	 * NOUVEAU v0.9.8 : Extrait un segment audio d'un AudioBuffer
	 */
	async extractAudioSegment(audioBuffer: AudioBuffer, startTime: number, endTime: number, audioContext: AudioContext): Promise<AudioBuffer> {
		const startSample = Math.floor(startTime * audioBuffer.sampleRate);
		const endSample = Math.floor(endTime * audioBuffer.sampleRate);
		const frameCount = endSample - startSample;
		
		const segmentBuffer = audioContext.createBuffer(
			audioBuffer.numberOfChannels,
			frameCount,
			audioBuffer.sampleRate
		);
		
		// Copier les données de chaque canal
		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const channelData = audioBuffer.getChannelData(channel);
			const segmentData = segmentBuffer.getChannelData(channel);
			
			for (let i = 0; i < frameCount; i++) {
				segmentData[i] = channelData[startSample + i];
			}
		}
		
		return segmentBuffer;
	}

	/**
	 * NOUVEAU v0.9.8 : Encode un AudioBuffer en WebM Blob via MediaRecorder
	 * Note: Cette méthode nécessite que l'audio soit "joué" pour être enregistré
	 */
	async encodeAudioToWebM(audioBuffer: AudioBuffer, audioContext: AudioContext): Promise<Blob> {
		return new Promise((resolve, reject) => {
			try {
				// Créer un MediaStreamDestination pour capturer l'audio
				const destination = audioContext.createMediaStreamDestination();
				
				// Créer un MediaRecorder pour encoder
				const mediaRecorder = new MediaRecorder(destination.stream, {
					mimeType: 'audio/webm;codecs=opus'
				});
				
				const chunks: Blob[] = [];
				let recordingStarted = false;
				
				mediaRecorder.ondataavailable = (event) => {
					if (event.data.size > 0) {
						chunks.push(event.data);
					}
				};
				
				mediaRecorder.onstop = () => {
					if (chunks.length > 0) {
						const blob = new Blob(chunks, { type: 'audio/webm' });
						resolve(blob);
					} else {
						reject(new Error('Aucune donnée audio enregistrée'));
					}
				};
				
				mediaRecorder.onerror = (error) => {
					reject(error);
				};
				
				// Créer un BufferSource pour jouer l'audio
				const source = audioContext.createBufferSource();
				source.buffer = audioBuffer;
				source.connect(destination);
				
				// Gérer la fin de lecture
				source.onended = () => {
					if (recordingStarted) {
						// Attendre un peu pour que MediaRecorder finisse d'enregistrer
						setTimeout(() => {
							if (mediaRecorder.state !== 'inactive') {
								mediaRecorder.stop();
							}
						}, 100);
					}
				};
				
				// Démarrer l'enregistrement
				mediaRecorder.start();
				recordingStarted = true;
				
				// Jouer l'audio
				source.start(0);
				
				// Timeout de sécurité
				const duration = audioBuffer.duration * 1000;
				setTimeout(() => {
					if (mediaRecorder.state !== 'inactive') {
						mediaRecorder.stop();
					}
					try {
						source.stop();
					} catch (e) {
						// Ignorer si déjà arrêté
					}
				}, duration + 500); // +500ms de marge
				
			} catch (error) {
				reject(error);
			}
		});
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
			
			// NOUVEAU v0.9.8 : Supprimer aussi les chunks temporaires s'ils existent
			if (recording.audioChunks && recording.audioChunks.length > 0) {
				await this.cleanupChunks(recording.audioChunks);
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
		console.log('Nombre d\'enregistrements dans l\'index:', this.recordingsIndex.length);
	}

	/**
	 * NOUVEAU : Traite un enregistrement de manière asynchrone (transcription + résumé)
	 * Cette méthode ne bloque pas les contrôles et permet le traitement en parallèle
	 */
	async processRecording(recordingId: string) {
		try {
			// Trouver l'enregistrement dans l'index
			const recording = this.recordingsIndex.find(r => r.id === recordingId);
			if (!recording) {
				console.error('Enregistrement non trouvé:', recordingId);
				return;
			}

			// Vérifier la clé API
			if (!this.settings.openaiApiKey || this.settings.openaiApiKey.trim() === '') {
				new Notice('Clé API OpenAI manquante. Veuillez la configurer dans les paramètres.');
				recording.status = 'error';
				await this.saveRecordingsIndex();
				this.updateSidebar();
				return;
			}

			// Marquer comme en cours de traitement
			recording.status = 'processing';
			await this.saveRecordingsIndex();
			this.updateSidebar();

			// NOUVEAU v0.9.9 : Vérifier si des chunks existent pour les fichiers volumineux
			let transcriptText = '';
			let transcriptLanguage: string | undefined = undefined;
			
			if (recording.audioChunks && recording.audioChunks.length > 0) {
				// Transcription multi-chunks
				console.log(`Fichier volumineux détecté: ${recording.audioChunks.length} chunks disponibles`);
				console.log('Démarrage de la transcription multi-chunks...');
				
				// Transcribe chaque chunk et combiner les transcriptions
				const combinedResult = await this.transcribeChunks(recording, recordingId);
				
				// Sauvegarder la transcription combinée
				await this.saveTranscription(recording, combinedResult.text, combinedResult.language);
				console.log(`Transcription multi-chunks terminée pour ${recording.title}`);
				
				transcriptText = combinedResult.text;
				transcriptLanguage = combinedResult.language;
			} else {
				// Transcription normale pour fichiers < 25 MB
				// Lire le fichier audio
				if (!recording.audioFile) {
					throw new Error('Fichier audio manquant');
				}

				const audioFile = this.app.vault.getAbstractFileByPath(recording.audioFile);
				if (!audioFile || !(audioFile instanceof TFile)) {
					throw new Error('Fichier audio introuvable');
				}

				const audioBuffer = await this.app.vault.readBinary(audioFile);
				const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

				// Vérifier la taille du fichier
				const maxSize = 25 * 1024 * 1024; // 25 MB
				if (audioBlob.size > maxSize) {
					throw new Error(`Fichier trop volumineux (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB). Maximum: 25 MB. Le découpage automatique devrait avoir créé des chunks.`);
				}

				// Effectuer la transcription
				console.log(`Démarrage de la transcription pour ${recording.title}`);
				const result = await this.transcriptionService.transcribeAudio(
					audioBlob,
					{
						apiKey: this.settings.openaiApiKey,
						model: this.settings.transcriptionModel,
						language: this.settings.transcriptionLanguage,
						responseFormat: 'verbose_json'
					},
					(status) => {
						console.log(`Transcription ${recordingId}:`, status);
					}
				);

				// Sauvegarder la transcription
				await this.saveTranscription(recording, result.text, result.language);
				console.log(`Transcription terminée pour ${recording.title}`);
				
				transcriptText = result.text;
				transcriptLanguage = result.language;
			}

			// Générer le résumé si configuré
			if (this.settings.summaryProvider === 'openai' && transcriptText) {
				console.log(`Démarrage du résumé pour ${recording.title}`);
				
				// Préparer les variables pour le template
				const variables = {
					transcript: transcriptText,
					language: transcriptLanguage || 'détectée',
					datetime: new Date().toLocaleString('fr-FR'),
					duration: this.formatDuration(recording.duration),
					title: recording.title,
					date: recording.date
				};

				// Générer le résumé
				const summaryResult = await this.summaryService.generateSummary(
					this.settings.summaryTemplate,
					variables,
					{
						apiKey: this.settings.openaiApiKey,
						model: this.settings.summaryModel,
						summaryLength: this.settings.summaryLength
					},
					(status) => {
						console.log(`Résumé ${recordingId}:`, status);
					}
				);

				// Sauvegarder le résumé
				await this.saveSummary(recording, summaryResult.text);
				console.log(`Résumé terminé pour ${recording.title}`);

				// Générer le titre AI en 3 mots
				await this.generateAITitle(recordingId, transcriptText);
			}

			// Marquer comme terminé
			recording.status = 'completed';
			await this.saveRecordingsIndex();
			this.updateSidebar();
			
			// NOUVEAU v0.9.8 : Nettoyer les chunks temporaires après transcription réussie
			if (recording.audioChunks && recording.audioChunks.length > 0) {
				await this.cleanupChunks(recording.audioChunks);
				recording.audioChunks = undefined; // Retirer les chunks de l'index
				await this.saveRecordingsIndex();
			}
			
			new Notice(`Traitement terminé pour ${recording.title}`);

		} catch (error) {
			console.error('Erreur lors du traitement de l\'enregistrement:', error);
			new Notice(`Erreur de traitement: ${error.message}`);
			
			// Mettre à jour le statut d'erreur
			const recording = this.recordingsIndex.find(r => r.id === recordingId);
			if (recording) {
				recording.status = 'error';
				await this.saveRecordingsIndex();
				this.updateSidebar();
				
				// NOUVEAU v0.9.8 : Nettoyer les chunks temporaires même en cas d'erreur
				// (pour éviter d'accumuler des fichiers temporaires)
				if (recording.audioChunks && recording.audioChunks.length > 0) {
					console.log('Nettoyage des chunks temporaires après erreur...');
					await this.cleanupChunks(recording.audioChunks).catch(error => {
						console.error('Erreur lors du nettoyage des chunks:', error);
					});
				}
			}
		}
	}

	/**
	 * NOUVEAU v0.9.9 : Transcrit chaque chunk individuellement et combine les transcriptions
	 * @param recording Métadonnées de l'enregistrement
	 * @param recordingId ID de l'enregistrement
	 * @returns Transcription combinée avec texte et langue
	 */
	async transcribeChunks(
		recording: RecordingMetadata,
		recordingId: string
	): Promise<{ text: string; language: string | undefined }> {
		if (!recording.audioChunks || recording.audioChunks.length === 0) {
			throw new Error('Aucun chunk disponible pour transcription');
		}

		const totalChunks = recording.audioChunks.length;
		const chunkTranscripts: Array<{ text: string; language?: string; chunkIndex: number }> = [];
		
		console.log(`Début de la transcription de ${totalChunks} chunks...`);

		// Transcribe chaque chunk séquentiellement pour maintenir l'ordre chronologique
		for (let i = 0; i < totalChunks; i++) {
			const chunkPath = recording.audioChunks![i];
			const chunkIndex = i + 1;
			
			try {
				// Mettre à jour le statut avec la progression
				recording.status = `processing_chunk_${chunkIndex}_${totalChunks}`;
				await this.saveRecordingsIndex();
				this.updateSidebar();
				
				console.log(`Transcription du chunk ${chunkIndex}/${totalChunks}...`);
				
				// Lire le chunk
				const chunkFile = this.app.vault.getAbstractFileByPath(chunkPath);
				if (!chunkFile || !(chunkFile instanceof TFile)) {
					throw new Error(`Chunk introuvable: ${chunkPath}`);
				}

				const chunkBuffer = await this.app.vault.readBinary(chunkFile);
				const chunkBlob = new Blob([chunkBuffer], { type: 'audio/webm' });

				// Transcribe le chunk avec retry en cas d'erreur
				let retryCount = 0;
				const maxRetries = 3;
				let chunkResult: { text: string; language?: string } | null = null;

				while (retryCount <= maxRetries) {
					try {
						chunkResult = await this.transcriptionService.transcribeAudio(
							chunkBlob,
							{
								apiKey: this.settings.openaiApiKey,
								model: this.settings.transcriptionModel,
								language: this.settings.transcriptionLanguage,
								responseFormat: 'verbose_json'
							},
							(status) => {
								console.log(`Chunk ${chunkIndex}/${totalChunks} - ${status}`);
							}
						);
						break; // Succès, sortir de la boucle retry
					} catch (error) {
						retryCount++;
						if (retryCount > maxRetries) {
							throw error; // Échec après tous les retries
						}
						console.warn(`Erreur lors de la transcription du chunk ${chunkIndex}, retry ${retryCount}/${maxRetries}...`, error);
						await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Backoff exponentiel
					}
				}

				if (!chunkResult) {
					throw new Error(`Échec de la transcription du chunk ${chunkIndex} après ${maxRetries} tentatives`);
				}

				chunkTranscripts.push({
					text: chunkResult.text,
					language: chunkResult.language,
					chunkIndex: chunkIndex
				});

				console.log(`Chunk ${chunkIndex}/${totalChunks} transcrit avec succès (${chunkResult.text.length} caractères)`);

			} catch (error) {
				console.error(`Erreur lors de la transcription du chunk ${chunkIndex}/${totalChunks}:`, error);
				throw new Error(`Échec de la transcription du chunk ${chunkIndex}/${totalChunks}: ${error.message}`);
			}
		}

		// Combiner les transcriptions dans l'ordre chronologique
		console.log('Combinaison des transcriptions...');
		const combinedResult = this.combineTranscriptions(chunkTranscripts);
		
		console.log(`Transcription combinée terminée: ${combinedResult.text.length} caractères`);
		
		return {
			text: combinedResult.text,
			language: combinedResult.language
		};
	}

	/**
	 * NOUVEAU v0.9.9 : Combine les transcriptions de chunks dans l'ordre chronologique
	 * @param chunkTranscripts Tableau des transcriptions de chunks avec leurs métadonnées
	 * @returns Transcription combinée avec texte et langue
	 */
	combineTranscriptions(
		chunkTranscripts: Array<{ text: string; language?: string; chunkIndex: number }>
	): { text: string; language: string | undefined } {
		// Trier par chunkIndex pour garantir l'ordre chronologique
		chunkTranscripts.sort((a, b) => a.chunkIndex - b.chunkIndex);

		// Combiner les textes avec un espace entre chaque chunk
		// Pour une meilleure fluidité, on supprime les espaces en début/fin de chaque chunk
		const combinedText = chunkTranscripts
			.map(chunk => chunk.text.trim())
			.filter(text => text.length > 0) // Filtrer les chunks vides
			.join(' ');

		// Utiliser la langue du premier chunk (généralement cohérente pour tous)
		const language = chunkTranscripts.length > 0 ? chunkTranscripts[0].language : undefined;

		return {
			text: combinedText,
			language: language
		};
	}

	/**
	 * NOUVEAU v0.9.8 : Nettoie les chunks temporaires après transcription
	 * @param chunkPaths Chemins des chunks temporaires à supprimer
	 */
	async cleanupChunks(chunkPaths: string[]): Promise<void> {
		try {
			console.log(`Nettoyage de ${chunkPaths.length} chunks temporaires...`);
			
			for (const chunkPath of chunkPaths) {
				try {
					const chunkFile = this.app.vault.getAbstractFileByPath(chunkPath);
					if (chunkFile && chunkFile instanceof TFile) {
						await this.app.vault.delete(chunkFile);
						console.log(`Chunk supprimé: ${chunkPath}`);
					}
				} catch (error) {
					console.warn(`Erreur lors de la suppression du chunk ${chunkPath}:`, error);
					// Continuer même si un chunk échoue
				}
			}
			
			console.log('Nettoyage des chunks terminé');
		} catch (error) {
			console.error('Erreur lors du nettoyage des chunks:', error);
			// Ne pas faire échouer le processus si le nettoyage échoue
		}
	}

	async transcribeRecording(recordingId: string) {
		try {
			// Trouver l'enregistrement dans l'index
			const recording = this.recordingsIndex.find(r => r.id === recordingId);
			if (!recording) {
				console.error('Enregistrement non trouvé:', recordingId);
				return;
			}

			// Vérifier la clé API
			if (!this.settings.openaiApiKey || this.settings.openaiApiKey.trim() === '') {
				new Notice('Clé API OpenAI manquante. Veuillez la configurer dans les paramètres.');
				recording.status = 'error';
				await this.saveRecordingsIndex();
				this.updateSidebar();
				return;
			}

			// Mettre à jour le statut
			recording.status = 'processing';
			await this.saveRecordingsIndex();
			this.updateSidebar();

			// Lire le fichier audio
			if (!recording.audioFile) {
				throw new Error('Fichier audio manquant');
			}

			const audioFile = this.app.vault.getAbstractFileByPath(recording.audioFile);
			if (!audioFile || !(audioFile instanceof TFile)) {
				throw new Error('Fichier audio introuvable');
			}

			const audioBuffer = await this.app.vault.readBinary(audioFile);
			const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

			// Effectuer la transcription
			const result = await this.transcriptionService.transcribeAudio(
				audioBlob,
				{
					apiKey: this.settings.openaiApiKey,
					model: this.settings.transcriptionModel,
					language: this.settings.transcriptionLanguage,
					responseFormat: 'verbose_json'
				},
				(status) => {
					console.log('Transcription status:', status);
				}
			);

			// Sauvegarder la transcription
			await this.saveTranscription(recording, result.text, result.language);

			// Mettre à jour le statut
			recording.status = 'completed';
			await this.saveRecordingsIndex();
			
			new Notice('Transcription terminée avec succès !');
			console.log('Transcription complétée:', result);

			// Démarrer la génération du résumé si configuré
			if (this.settings.summaryProvider === 'openai') {
				await this.generateSummary(recordingId, result.text);
			} else {
				this.updateSidebar();
			}

		} catch (error) {
			console.error('Erreur lors de la transcription:', error);
			new Notice(`Erreur de transcription: ${error.message}`);
			
			// Mettre à jour le statut d'erreur
			const recording = this.recordingsIndex.find(r => r.id === recordingId);
			if (recording) {
				recording.status = 'error';
				await this.saveRecordingsIndex();
			}

			this.updateSidebar();
		}
	}

	async saveTranscription(recording: RecordingMetadata, transcriptText: string, language?: string) {
		try {
			// NOUVEAU v0.9.7 : Créer directement le fichier combiné unique
			const audioPath = recording.audioFile || '';
			const combinedPath = audioPath.replace('.webm', '.md');
			
			// Créer le contenu du fichier unique avec lien audio + résumé (placeholder) + transcription
			const content = `# ${recording.title}

**Date:** ${recording.date}
**Durée:** ${this.formatDuration(recording.duration)}
${language ? `**Langue:** ${language}` : ''}

## 🎵 Audio

![[${audioPath}]]

---

## 📝 Résumé

_Le résumé sera ajouté automatiquement après génération..._

---

## 📄 Transcription Complète

${transcriptText}

---

*Note générée automatiquement par AI Recording Plugin*
`;

			// Sauvegarder le fichier unique
			const existingFile = this.app.vault.getAbstractFileByPath(combinedPath);
			if (existingFile && existingFile instanceof TFile) {
				await this.app.vault.modify(existingFile, content);
			} else {
				await this.app.vault.create(combinedPath, content);
			}

			// Mettre à jour les métadonnées
			recording.transcriptFile = combinedPath; // Le fichier transcription est maintenant le fichier combiné
			recording.updatedAt = Date.now();
			await this.saveRecordingsIndex();

			console.log('Fichier combiné créé:', combinedPath);

		} catch (error) {
			console.error('Erreur lors de la sauvegarde du fichier combiné:', error);
			throw error;
		}
	}

	formatDuration(milliseconds: number): string {
		const minutes = Math.floor(milliseconds / 60000);
		const seconds = Math.floor((milliseconds % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	async generateAITitle(recordingId: string, transcriptText: string) {
		try {
			const recording = this.recordingsIndex.find(r => r.id === recordingId);
			if (!recording) return;

			// Générer le titre AI en 3 mots
			const aiTitle = await this.summaryService.generateShortTitle(
				transcriptText,
				this.settings.openaiApiKey,
				'gpt-4o-mini'
			);

			// Utiliser la durée de l'enregistrement au format MM:SS
			const durationStr = this.formatDuration(recording.duration);

			// Nouveau format: "Titre AI - MM:SS"
			recording.title = `${aiTitle} - ${durationStr}`;
			recording.updatedAt = Date.now();
			
			await this.saveRecordingsIndex();
			this.updateSidebar();
			
			console.log('Titre AI généré:', recording.title);

			// NOUVEAU v0.9.6 : Renommer automatiquement les fichiers avec le titre AI
			await this.renameRecordingFiles(recordingId, aiTitle);
			
		} catch (error) {
			console.error('Erreur lors de la génération du titre AI:', error);
			// On continue sans bloquer en cas d'erreur
		}
	}

	/**
	 * NOUVEAU v0.9.7 : Renomme les fichiers de l'enregistrement avec le titre AI + date/heure
	 * 2 fichiers seulement : Audio - Titre.webm et Titre.md
	 * @param recordingId ID de l'enregistrement
	 * @param aiTitle Titre AI en 3 mots (sans la durée)
	 */
	async renameRecordingFiles(recordingId: string, aiTitle: string) {
		try {
			const recording = this.recordingsIndex.find(r => r.id === recordingId);
			if (!recording) {
				console.error('Enregistrement non trouvé pour renommage:', recordingId);
				return;
			}

			console.log(`Renommage des fichiers pour: ${aiTitle}`);

			// Nettoyer le titre AI pour utilisation en nom de fichier
			const safeTitle = this.sanitizeFilename(aiTitle);
			
			// Extraire le dossier et la date/heure du fichier audio
			const audioPath = recording.audioFile || '';
			const folderPath = audioPath.substring(0, audioPath.lastIndexOf('/'));
			
			// Extraire la date et l'heure du nom du fichier audio
			// Format: Recording_2025-10-16_14-30-00.webm
			const originalAudioFileName = audioPath.substring(audioPath.lastIndexOf('/') + 1);
			const dateTimeMatch = originalAudioFileName.match(/Recording_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
			
			let dateTimeStr = '';
			if (dateTimeMatch) {
				const date = dateTimeMatch[1]; // YYYY-MM-DD
				const time = dateTimeMatch[2]; // HH-MM-SS
				dateTimeStr = ` - ${date} ${time}`;
			}

			// Créer les nouveaux noms de fichiers
			const newMdFileName = `${safeTitle}${dateTimeStr}.md`;
			const newAudioFileName = `Audio - ${safeTitle}${dateTimeStr}.webm`;

			// 1. Renommer le fichier .md (fichier combiné unique)
			if (recording.transcriptFile) {
				const newMdPath = `${folderPath}/${newMdFileName}`;
				await this.renameFile(recording.transcriptFile, newMdPath);
				recording.transcriptFile = newMdPath;
				recording.summaryFile = newMdPath; // Même fichier
				console.log(`Fichier .md renommé: ${newMdPath}`);
			}

			// 2. Renommer le fichier audio
			const newAudioPath = `${folderPath}/${newAudioFileName}`;
			await this.renameFile(audioPath, newAudioPath);
			recording.audioFile = newAudioPath;
			console.log(`Fichier audio renommé: ${newAudioPath}`);

			// 3. Mettre à jour le lien audio dans le fichier .md
			await this.updateAudioLinkInFile(recording.transcriptFile, audioPath, newAudioPath);

			// Mettre à jour l'index et rafraîchir l'affichage
			recording.updatedAt = Date.now();
			await this.saveRecordingsIndex();
			this.updateSidebar();

			new Notice(`Fichiers renommés: ${safeTitle}`);
			console.log(`Renommage terminé pour: ${safeTitle}${dateTimeStr}`);

		} catch (error) {
			console.error('Erreur lors du renommage des fichiers:', error);
			new Notice(`Erreur lors du renommage des fichiers`);
		}
	}

	/**
	 * Met à jour le lien audio dans le fichier .md après renommage
	 */
	async updateAudioLinkInFile(mdFilePath: string, oldAudioPath: string, newAudioPath: string): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(mdFilePath);
			if (!file || !(file instanceof TFile)) {
				console.warn(`Fichier .md non trouvé: ${mdFilePath}`);
				return;
			}

			let content = await this.app.vault.read(file);
			
			// Remplacer l'ancien lien par le nouveau
			content = content.replace(`![[${oldAudioPath}]]`, `![[${newAudioPath}]]`);
			
			await this.app.vault.modify(file, content);
			console.log('Lien audio mis à jour dans le fichier .md');

		} catch (error) {
			console.error('Erreur lors de la mise à jour du lien audio:', error);
		}
	}

	/**
	 * Nettoie un nom de fichier en supprimant les caractères invalides
	 */
	sanitizeFilename(filename: string): string {
		// Remplacer les caractères invalides par des espaces ou les supprimer
		return filename
			.replace(/[<>:"/\\|?*]/g, '') // Supprimer les caractères invalides
			.replace(/\s+/g, ' ') // Normaliser les espaces multiples
			.trim();
	}

	/**
	 * Renomme un fichier dans le vault Obsidian
	 */
	async renameFile(oldPath: string, newPath: string): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(oldPath);
			if (!file || !(file instanceof TFile)) {
				console.warn(`Fichier non trouvé pour renommage: ${oldPath}`);
				return;
			}

			// Vérifier si un fichier avec le nouveau nom existe déjà
			const existingFile = this.app.vault.getAbstractFileByPath(newPath);
			if (existingFile) {
				console.warn(`Un fichier existe déjà à: ${newPath}`);
				return;
			}

			// Renommer le fichier
			await this.app.fileManager.renameFile(file, newPath);
			console.log(`Fichier renommé: ${oldPath} → ${newPath}`);

		} catch (error) {
			console.error(`Erreur lors du renommage ${oldPath} → ${newPath}:`, error);
			throw error;
		}
	}

	async generateSummary(recordingId: string, transcriptText: string) {
		try {
			// Trouver l'enregistrement dans l'index
			const recording = this.recordingsIndex.find(r => r.id === recordingId);
			if (!recording) {
				console.error('Enregistrement non trouvé:', recordingId);
				return;
			}

			// Vérifier la clé API
			if (!this.settings.openaiApiKey || this.settings.openaiApiKey.trim() === '') {
				new Notice('Clé API OpenAI manquante pour le résumé.');
				recording.status = 'error';
				await this.saveRecordingsIndex();
				this.updateSidebar();
				return;
			}

			// Marquer comme en cours de traitement
			recording.status = 'processing';
			await this.saveRecordingsIndex();
			this.updateSidebar();

			// Préparer les variables pour le template
			const variables = {
				transcript: transcriptText,
				language: recording.transcriptFile ? 'détectée' : 'non détectée',
				datetime: new Date().toLocaleString('fr-FR'),
				duration: this.formatDuration(recording.duration),
				title: recording.title,
				date: recording.date
			};

			// Générer le résumé
			const result = await this.summaryService.generateSummary(
				this.settings.summaryTemplate,
				variables,
				{
					apiKey: this.settings.openaiApiKey,
					model: this.settings.summaryModel,
					summaryLength: this.settings.summaryLength
				},
				(status) => {
					console.log('Summary status:', status);
				}
			);

			// Sauvegarder le résumé
			await this.saveSummary(recording, result.text);

			new Notice('Résumé généré avec succès !');
			console.log('Résumé complété:', result);

			// Générer le titre AI en 3 mots
			await this.generateAITitle(recordingId, transcriptText);

			// Marquer comme terminé
			recording.status = 'completed';
			await this.saveRecordingsIndex();
			this.updateSidebar();

		} catch (error) {
			console.error('Erreur lors de la génération du résumé:', error);
			new Notice(`Erreur de génération du résumé: ${error.message}`);
			
			// Mettre à jour le statut d'erreur
			const recording = this.recordingsIndex.find(r => r.id === recordingId);
			if (recording) {
				recording.status = 'error';
				await this.saveRecordingsIndex();
			}
			this.updateSidebar();
		}
	}

	async saveSummary(recording: RecordingMetadata, summaryText: string) {
		try {
			// NOUVEAU v0.9.7 : Mettre à jour le fichier combiné existant avec le résumé
			const combinedPath = recording.transcriptFile; // Le fichier combiné est déjà créé
			
			if (!combinedPath) {
				console.error('Fichier combiné introuvable');
				return;
			}

			const file = this.app.vault.getAbstractFileByPath(combinedPath);
			if (!file || !(file instanceof TFile)) {
				console.error('Fichier combiné introuvable:', combinedPath);
				return;
			}

			// Lire le contenu actuel
			let content = await this.app.vault.read(file);

			// Remplacer le placeholder du résumé par le vrai résumé
			const summaryPlaceholder = '_Le résumé sera ajouté automatiquement après génération..._';
			if (content.includes(summaryPlaceholder)) {
				content = content.replace(summaryPlaceholder, summaryText);
			} else {
				// Si le placeholder n'existe pas, insérer le résumé après "## 📝 Résumé"
				const summarySection = '## 📝 Résumé\n\n';
				const summaryIndex = content.indexOf(summarySection);
				if (summaryIndex !== -1) {
					const endIndex = content.indexOf('\n\n---\n\n## 📄 Transcription', summaryIndex);
					if (endIndex !== -1) {
						content = content.substring(0, summaryIndex + summarySection.length) + 
						         summaryText + 
						         content.substring(endIndex);
					}
				}
			}

			// Sauvegarder le fichier mis à jour
			await this.app.vault.modify(file, content);

			// Mettre à jour les métadonnées
			recording.summaryFile = combinedPath; // Même fichier que la transcription
			recording.updatedAt = Date.now();
			await this.saveRecordingsIndex();

			console.log('Résumé ajouté au fichier combiné:', combinedPath);

		} catch (error) {
			console.error('Erreur lors de la mise à jour du résumé:', error);
			throw error;
		}
	}
}
