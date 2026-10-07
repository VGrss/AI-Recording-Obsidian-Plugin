import { Plugin, Notice, WorkspaceLeaf, TFile } from 'obsidian';
import { AIRecordingView, AI_RECORDING_VIEW_TYPE } from './ai-recording-view';
import { AIRecordingSettings, DEFAULT_SETTINGS, AIRecordingSettingTab } from './settings';
import { TranscriptionService } from './transcription-service';
import { SummaryService, NUM_CTX } from './summary-service';
import { ProcessingLog } from './processing-logger';
import { decodeToMono16k, encodeWav, WHISPER_SAMPLE_RATE } from './audio-utils';

export type RecordingState = 'IDLE' | 'RECORDING' | 'PAUSED' | 'FINISHED' | 'DELETED' | 'UPLOADING' | 'TRANSCRIBING' | 'SUMMARIZING';

export interface RecordingMetadata {
	id: string;
	title: string;
	date: string;
	duration: number;
	status: 'pending' | 'processing' | 'completed' | 'error';
	processingStep?: string; // Étape en cours affichée pendant le traitement
	audioFile?: string;
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
	} | null = null;
	mediaRecorder: MediaRecorder | null = null;
	audioStream: MediaStream | null = null;
	recordingsIndex: RecordingMetadata[] = [];
	recordingsFolder: string = 'AI Recordings';
	transcriptionService: TranscriptionService;
	summaryService: SummaryService;
	lastProcessingLog: { recordingId: string; text: string } | null = null;

	async onload() {
		console.log('Plugin AI Recording chargé');

		await this.loadSettings();
		this.recordingsFolder = this.settings.recordingsFolder;

		this.transcriptionService = new TranscriptionService();
		this.summaryService = new SummaryService();

		new Notice('Plugin AI Recording chargé avec succès');

		this.registerView(AI_RECORDING_VIEW_TYPE, (leaf) => {
			this.recordingView = new AIRecordingView(leaf, this);
			return this.recordingView;
		});

		this.addRibbonIcon('mic', 'AI Recording', async () => {
			await this.toggleSidebar();
		});

		this.addSettingTab(new AIRecordingSettingTab(this.app, this));

		this.registerCommands();

		this.app.workspace.onLayoutReady(() => {
			console.log('Workspace ready, loading recordings index...');
			this.loadRecordingsIndex();
		});
	}

	registerCommands() {
		this.addCommand({
			id: 'toggle-sidebar',
			name: 'Ouvrir/Fermer la sidebar AI Recording',
			callback: async () => {
				await this.toggleSidebar();
			}
		});

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

		this.addCommand({
			id: 'copy-processing-log',
			name: 'Copier le journal du dernier traitement',
			callback: async () => {
				await this.copyProcessingLog();
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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

		// @ts-ignore
		const isRightSidebarCollapsed = workspace.rightSplit?.collapsed;

		if (isRightSidebarCollapsed) {
			// @ts-ignore
			this.app.commands.executeCommandById('app:toggle-right-sidebar');
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		const existing = workspace.getLeavesOfType(AI_RECORDING_VIEW_TYPE);

		if (existing.length > 0) {
			workspace.revealLeaf(existing[0]);
			this.sidebar = existing[0];
			return;
		}

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
			this.audioStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});

			this.mediaRecorder = new MediaRecorder(this.audioStream, {
				mimeType: 'audio/webm;codecs=opus'
			});

			this.currentRecording = {
				id: `recording_${Date.now()}`,
				startTime: new Date(),
				pausedTime: 0,
				segments: [],
				audioChunks: []
			};

			this.setupMediaRecorderEvents();

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
			const blobReady = new Promise<void>((resolve) => {
				if (this.mediaRecorder) {
					this.mediaRecorder.addEventListener('stop', () => {
						setTimeout(() => resolve(), 100);
					}, { once: true });
				}
			});

			if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
				this.mediaRecorder.stop();
			}

			await blobReady;

			if (this.audioStream) {
				this.audioStream.getTracks().forEach(track => track.stop());
				this.audioStream = null;
			}

			const recordingId = await this.saveRecording();

			this.updateSidebar();

			this.setRecordingState('IDLE');

			if (recordingId && this.settings.autoProcess) {
				this.processRecording(recordingId).catch(error => {
					console.error('Erreur lors du traitement de l\'enregistrement:', error);
				});
			} else if (recordingId) {
				new Notice('Enregistrement sauvegardé. Utilisez "Traiter" dans l\'historique pour le transcrire.');
			}
		}
	}

	deleteRecording() {
		if (this.mediaRecorder && this.currentRecording) {
			if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
				this.mediaRecorder.stop();
			}

			if (this.audioStream) {
				this.audioStream.getTracks().forEach(track => track.stop());
				this.audioStream = null;
			}

			new Notice('Enregistrement supprimé');
			console.log('Enregistrement supprimé');

			setTimeout(() => {
				this.setRecordingState('IDLE');
			}, 500);
		}
	}

	resetToIdle() {
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
			console.log('Loading recordings index from:', indexFile);

			const file = this.app.vault.getAbstractFileByPath(indexFile);

			if (file && file instanceof TFile) {
				const content = await this.app.vault.read(file);
				this.recordingsIndex = JSON.parse(content);
				console.log('Recordings index loaded successfully:', this.recordingsIndex.length, 'recordings');

				// Un traitement resté "en cours" après fermeture d'Obsidian ne reprendra jamais
				for (const recording of this.recordingsIndex) {
					if (String(recording.status).startsWith('processing')) {
						recording.status = 'error';
						recording.processingStep = undefined;
					}
				}
			} else {
				console.log('Index file not found, rebuilding from audio files...');
				await this.rebuildRecordingsIndex();
			}

			this.updateSidebar();
		} catch (error) {
			console.error('Erreur lors du chargement de l\'index:', error);
			this.recordingsIndex = [];
		}
	}

	async rebuildRecordingsIndex() {
		try {
			const allFiles = this.app.vault.getFiles();
			console.log('Total files in vault:', allFiles.length);

			const audioFiles = allFiles.filter(f =>
				f.path.startsWith(this.recordingsFolder) &&
				f.path.endsWith('.webm')
			);

			console.log('Found audio files:', audioFiles.length);

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

			this.recordingsIndex.sort((a, b) => b.createdAt - a.createdAt);

			console.log('Rebuilt index with', this.recordingsIndex.length, 'recordings');

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
		await this.ensureFolder(this.recordingsFolder);
	}

	async ensureFolder(folderPath: string) {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	async saveRecording(): Promise<string | null> {
		if (!this.currentRecording || !this.currentRecording.audioBlob) {
			console.error('Aucun enregistrement à sauvegarder');
			return null;
		}

		try {
			await this.ensureRecordingsFolder();

			const date = new Date();
			const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
			const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
			const baseName = `Recording_${dateStr}_${timeStr}`;

			const folder = this.settings.organizeByDate
				? `${this.recordingsFolder}/${dateStr}`
				: this.recordingsFolder;
			await this.ensureFolder(folder);

			const audioPath = `${folder}/${baseName}.webm`;
			await this.app.vault.createBinary(audioPath, await this.currentRecording.audioBlob.arrayBuffer());

			const metadata: RecordingMetadata = {
				id: this.currentRecording.id,
				title: `Enregistrement ${dateStr} ${timeStr}`,
				date: dateStr,
				duration: this.getRecordingDuration(),
				status: 'pending',
				audioFile: audioPath,
				segments: this.currentRecording.segments,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			this.recordingsIndex.unshift(metadata);
			await this.saveRecordingsIndex();

			console.log('Enregistrement sauvegardé:', metadata);

			return this.currentRecording.id;

		} catch (error) {
			console.error('Erreur lors de la sauvegarde:', error);
			new Notice('Erreur lors de la sauvegarde de l\'enregistrement');
			return null;
		}
	}

	getRecordingsIndex(): RecordingMetadata[] {
		return this.recordingsIndex;
	}

	async deleteRecordingFromIndex(recordingId: string) {
		try {
			const recordingIndex = this.recordingsIndex.findIndex(r => r.id === recordingId);
			if (recordingIndex === -1) {
				console.error('Enregistrement non trouvé:', recordingId);
				return;
			}

			const recording = this.recordingsIndex[recordingIndex];

			if (recording.audioFile) {
				const audioFile = this.app.vault.getAbstractFileByPath(recording.audioFile);
				if (audioFile) {
					await this.app.vault.delete(audioFile);
				}
			}

			this.recordingsIndex.splice(recordingIndex, 1);
			await this.saveRecordingsIndex();

			new Notice('Enregistrement supprimé');
			console.log('Enregistrement supprimé:', recordingId);

		} catch (error) {
			console.error('Erreur lors de la suppression:', error);
			new Notice('Erreur lors de la suppression de l\'enregistrement');
		}
	}

	updateSidebar() {
		if (this.recordingView) {
			this.recordingView.updateDisplay();
		}
	}

	/**
	 * Pipeline local : Whisper (transcription) → Llama (résumé, titre) → fichiers.
	 * Chaque étape est journalisée ; le journal est sauvegardé même en cas d'échec.
	 */
	async processRecording(recordingId: string) {
		const recording = this.recordingsIndex.find(r => r.id === recordingId);
		if (!recording) {
			console.error('Enregistrement non trouvé:', recordingId);
			return;
		}

		const log = new ProcessingLog(`Journal de traitement - ${recording.title}`, {
			'Recording ID': recording.id,
			'Fichier audio': recording.audioFile ?? '(aucun)',
			'Durée enregistrement': `${this.formatDuration(recording.duration)} (${Math.round(recording.duration)} ms)`,
			'Version plugin': this.manifest.version,
			'Environnement': navigator.userAgent,
			'URL Whisper': this.settings.whisperUrl,
			'Langue': this.settings.transcriptionLanguage,
			'URL Ollama': this.settings.ollamaUrl,
			'Modèle Llama': this.settings.llmModel,
			'Longueur résumé': this.settings.summaryLength,
			'Longueur template': `${this.settings.summaryTemplate.length} caractères`,
			'Fenêtre contexte (num_ctx)': NUM_CTX
		});
		log.info('Traitement démarré');

		try {
			await this.setProcessingStep(recording, 'Vérification des services locaux', log);
			await this.checkLocalServices(log);

			await this.setProcessingStep(recording, 'Préparation de l\'audio', log);
			const wav = await this.prepareAudioForWhisper(recording, log);

			await this.setProcessingStep(recording, 'Transcription (Whisper)', log);
			const language = this.settings.transcriptionLanguage === 'auto' ? undefined : this.settings.transcriptionLanguage;
			const transcript = await log.time('Transcription Whisper', () =>
				this.transcriptionService.transcribe(wav, { baseUrl: this.settings.whisperUrl, language }, log)
			);
			log.info('Transcription obtenue', {
				detectedLanguage: transcript.language ?? 'inconnue',
				segments: transcript.segmentCount ?? 'inconnu',
				chars: transcript.text.length,
				preview: transcript.text.slice(0, 200)
			});
			await this.saveTranscription(recording, transcript.text, transcript.language);
			log.ok('Transcription sauvegardée', { file: recording.transcriptFile });

			await this.setProcessingStep(recording, 'Résumé (Llama)', log);
			await this.generateSummary(recording, transcript.text, transcript.language, log);

			await this.setProcessingStep(recording, 'Titre et renommage', log);
			await this.generateAITitle(recording.id, transcript.text, log);

			recording.status = 'completed';
			recording.processingStep = undefined;
			recording.updatedAt = Date.now();
			await this.saveRecordingsIndex();
			this.updateSidebar();

			log.finish('completed');
			new Notice(`Traitement terminé pour ${recording.title}`);
		} catch (error) {
			log.error('Traitement interrompu', error);
			log.finish('error');

			recording.status = 'error';
			recording.processingStep = undefined;
			await this.saveRecordingsIndex();
			this.updateSidebar();

			new Notice(`Erreur de traitement: ${(error as Error).message}. Copiez le journal depuis la carte de l'enregistrement.`);
		} finally {
			await this.saveProcessingLog(recording.id, log);
		}
	}

	private async setProcessingStep(recording: RecordingMetadata, step: string, log: ProcessingLog) {
		log.step(`Étape: ${step}`);
		recording.status = 'processing';
		recording.processingStep = step;
		await this.saveRecordingsIndex();
		this.updateSidebar();
	}

	private async checkLocalServices(log: ProcessingLog) {
		await this.transcriptionService.checkServer(this.settings.whisperUrl, log);
		await this.summaryService.checkServer(this.settings.ollamaUrl, this.settings.llmModel, log);
	}

	/**
	 * Décode le WebM et produit le WAV 16 kHz mono attendu par whisper.cpp
	 */
	private async prepareAudioForWhisper(recording: RecordingMetadata, log: ProcessingLog): Promise<ArrayBuffer> {
		if (!recording.audioFile) {
			throw new Error('Chemin du fichier audio absent de l\'index');
		}

		const file = this.app.vault.getAbstractFileByPath(recording.audioFile);
		if (!(file instanceof TFile)) {
			throw new Error(`Fichier audio introuvable: ${recording.audioFile}`);
		}

		const data = await this.app.vault.readBinary(file);
		log.info('Fichier audio lu', { path: recording.audioFile, sizeKB: Math.round(data.byteLength / 1024) });

		const decoded = await log.time('Décodage WebM/Opus', () => decodeToMono16k(data));
		log.info('Audio décodé', {
			durationSec: Number(decoded.durationSec.toFixed(2)),
			sourceSampleRate: decoded.sourceSampleRate,
			sourceChannels: decoded.sourceChannels,
			targetSampleRate: WHISPER_SAMPLE_RATE,
			targetSamples: decoded.samples.length
		});

		const wav = encodeWav(decoded.samples, WHISPER_SAMPLE_RATE);
		log.ok('WAV 16 kHz mono prêt', { sizeKB: Math.round(wav.byteLength / 1024) });
		return wav;
	}

	formatDuration(milliseconds: number): string {
		const minutes = Math.floor(milliseconds / 60000);
		const seconds = Math.floor((milliseconds % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	async saveTranscription(recording: RecordingMetadata, transcriptText: string, language?: string) {
		const audioPath = recording.audioFile || '';
		const notePath = recording.transcriptFile ?? audioPath.replace(/\.webm$/, '.md');

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

		const existingFile = this.app.vault.getAbstractFileByPath(notePath);
		if (existingFile && existingFile instanceof TFile) {
			await this.app.vault.modify(existingFile, content);
		} else {
			await this.app.vault.create(notePath, content);
		}

		recording.transcriptFile = notePath;
		recording.updatedAt = Date.now();
		await this.saveRecordingsIndex();
	}

	async generateSummary(recording: RecordingMetadata, transcriptText: string, language: string | undefined, log: ProcessingLog) {
		const variables = {
			transcript: transcriptText,
			language: language || 'détectée',
			datetime: new Date().toLocaleString('fr-FR'),
			duration: this.formatDuration(recording.duration),
			title: recording.title,
			date: recording.date
		};

		const result = await log.time('Résumé Llama', () =>
			this.summaryService.generateSummary(
				this.settings.summaryTemplate,
				variables,
				{
					baseUrl: this.settings.ollamaUrl,
					model: this.settings.llmModel,
					summaryLength: this.settings.summaryLength
				},
				log
			)
		);

		await this.saveSummary(recording, result.text);
		log.ok('Résumé sauvegardé', { file: recording.summaryFile, chars: result.text.length });
	}

	/**
	 * Génère le titre en 3 mots puis renomme les fichiers. Non bloquant : une erreur est journalisée.
	 */
	async generateAITitle(recordingId: string, transcriptText: string, log: ProcessingLog) {
		const recording = this.recordingsIndex.find(r => r.id === recordingId);
		if (!recording) return;

		try {
			const aiTitle = await log.time('Génération du titre', () =>
				this.summaryService.generateShortTitle(
					transcriptText,
					{ baseUrl: this.settings.ollamaUrl, model: this.settings.llmModel },
					log
				)
			);

			recording.title = `${aiTitle} - ${this.formatDuration(recording.duration)}`;
			recording.updatedAt = Date.now();
			await this.saveRecordingsIndex();
			this.updateSidebar();
			log.ok('Titre généré', { title: recording.title });

			await this.renameRecordingFiles(recordingId, aiTitle, log);
		} catch (error) {
			log.warn('Titre non généré, les noms de fichiers sont conservés', { error: (error as Error).message });
		}
	}

	/**
	 * Renomme la note et l'audio avec le titre AI + date/heure
	 */
	async renameRecordingFiles(recordingId: string, aiTitle: string, log: ProcessingLog) {
		try {
			const recording = this.recordingsIndex.find(r => r.id === recordingId);
			if (!recording || !recording.audioFile) {
				log.warn('Renommage ignoré: enregistrement ou audio introuvable');
				return;
			}

			const safeTitle = this.sanitizeFilename(aiTitle);
			const audioPath = recording.audioFile;
			const folderPath = audioPath.substring(0, audioPath.lastIndexOf('/'));

			// Format attendu : Recording_2025-10-16_14-30-00.webm
			const originalAudioFileName = audioPath.substring(audioPath.lastIndexOf('/') + 1);
			const dateTimeMatch = originalAudioFileName.match(/Recording_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
			const dateTimeStr = dateTimeMatch ? ` - ${dateTimeMatch[1]} ${dateTimeMatch[2]}` : '';

			const newMdPath = `${folderPath}/${safeTitle}${dateTimeStr}.md`;
			const newAudioPath = `${folderPath}/Audio - ${safeTitle}${dateTimeStr}.webm`;

			if (recording.transcriptFile) {
				if (await this.renameFile(recording.transcriptFile, newMdPath, log)) {
					recording.transcriptFile = newMdPath;
					recording.summaryFile = newMdPath;
				}
			}

			if (await this.renameFile(audioPath, newAudioPath, log)) {
				recording.audioFile = newAudioPath;
			}

			if (recording.transcriptFile) {
				await this.updateAudioLinkInFile(recording.transcriptFile, audioPath, recording.audioFile, log);
			}

			recording.updatedAt = Date.now();
			await this.saveRecordingsIndex();
			this.updateSidebar();

			new Notice(`Fichiers renommés: ${safeTitle}`);
			log.ok('Fichiers renommés', { note: recording.transcriptFile, audio: recording.audioFile });
		} catch (error) {
			log.error('Erreur lors du renommage des fichiers', error);
			new Notice('Erreur lors du renommage des fichiers');
		}
	}

	async updateAudioLinkInFile(mdFilePath: string, oldAudioPath: string, newAudioPath: string, log: ProcessingLog): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(mdFilePath);
			if (!file || !(file instanceof TFile)) {
				log.warn('Note introuvable pour mise à jour du lien audio', { path: mdFilePath });
				return;
			}

			const content = await this.app.vault.read(file);
			const updated = content.replace(`![[${oldAudioPath}]]`, `![[${newAudioPath}]]`);
			if (updated !== content) {
				await this.app.vault.modify(file, updated);
			}
		} catch (error) {
			log.error('Erreur lors de la mise à jour du lien audio', error);
		}
	}

	sanitizeFilename(filename: string): string {
		return filename
			.replace(/[<>:"/\\|?*]/g, '')
			.replace(/\s+/g, ' ')
			.trim();
	}

	/**
	 * Renomme un fichier. Retourne false si la source est absente ou si la cible existe déjà.
	 */
	async renameFile(oldPath: string, newPath: string, log: ProcessingLog): Promise<boolean> {
		if (oldPath === newPath) return true;

		const file = this.app.vault.getAbstractFileByPath(oldPath);
		if (!file || !(file instanceof TFile)) {
			log.warn('Fichier introuvable pour renommage', { path: oldPath });
			return false;
		}

		if (this.app.vault.getAbstractFileByPath(newPath)) {
			log.warn('Renommage ignoré: la cible existe déjà', { target: newPath });
			return false;
		}

		await this.app.fileManager.renameFile(file, newPath);
		log.info('Fichier renommé', { from: oldPath, to: newPath });
		return true;
	}

	async saveSummary(recording: RecordingMetadata, summaryText: string) {
		const notePath = recording.transcriptFile;
		if (!notePath) {
			throw new Error('Note de transcription absente: impossible d\'ajouter le résumé');
		}

		const file = this.app.vault.getAbstractFileByPath(notePath);
		if (!file || !(file instanceof TFile)) {
			throw new Error(`Note introuvable: ${notePath}`);
		}

		let content = await this.app.vault.read(file);

		const summaryPlaceholder = '_Le résumé sera ajouté automatiquement après génération..._';
		if (content.includes(summaryPlaceholder)) {
			content = content.replace(summaryPlaceholder, summaryText);
		} else {
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

		await this.app.vault.modify(file, content);

		recording.summaryFile = notePath;
		recording.updatedAt = Date.now();
		await this.saveRecordingsIndex();
	}

	/**
	 * Sauvegarde le journal dans le dossier caché du plugin (ou seulement en mémoire si désactivé)
	 */
	private async saveProcessingLog(recordingId: string, log: ProcessingLog) {
		const text = log.toText();
		this.lastProcessingLog = { recordingId, text };

		if (!this.settings.captureLogs) return;

		try {
			const dir = this.processingLogDir();
			if (!(await this.app.vault.adapter.exists(dir))) {
				await this.app.vault.adapter.mkdir(dir);
			}
			await this.app.vault.adapter.write(this.processingLogPath(recordingId), text);
		} catch (error) {
			console.error('Impossible d\'écrire le journal de traitement:', error);
		}
	}

	async getProcessingLogText(recordingId: string): Promise<string | null> {
		if (this.lastProcessingLog?.recordingId === recordingId) {
			return this.lastProcessingLog.text;
		}
		const path = this.processingLogPath(recordingId);
		if (await this.app.vault.adapter.exists(path)) {
			return this.app.vault.adapter.read(path);
		}
		return null;
	}

	/**
	 * Copie le journal dans le presse-papiers (par défaut : le dernier traitement)
	 */
	async copyProcessingLog(recordingId?: string) {
		const id = recordingId ?? this.lastProcessingLog?.recordingId;
		const text = id ? await this.getProcessingLogText(id) : null;

		if (!text) {
			new Notice('Aucun journal de traitement disponible');
			return;
		}

		await navigator.clipboard.writeText(text);
		new Notice('Journal de traitement copié dans le presse-papiers');
	}

	private processingLogDir(): string {
		return `${this.manifest.dir}/processing-logs`;
	}

	private processingLogPath(recordingId: string): string {
		return `${this.processingLogDir()}/${recordingId}.log`;
	}
}
