import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
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
	historyList: HTMLElement;
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

		this.historyList = this.historyZone.createDiv('ai-recording-history-list');
		this.updateHistoryList();

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
			// NOUVEAU : Les états de traitement ne bloquent plus les contrôles
			// Les cartes affichent leur propre statut de traitement
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
		stopButton.onclick = () => this.confirmDeleteCurrentRecording();
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
		stopButton.onclick = () => this.confirmDeleteCurrentRecording();
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

	confirmDeleteCurrentRecording() {
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
		this.updateHistoryList();
	}

	updateHistoryList() {
		this.historyList.empty();
		
		const recordings = this.plugin.getRecordingsIndex();
		console.log('Recordings from index:', recordings);
		
		if (recordings.length === 0) {
			this.historyList.textContent = 'Aucun enregistrement pour le moment';
			this.historyList.className = 'ai-recording-history-list ai-recording-history-empty';
			return;
		}
		
		this.historyList.className = 'ai-recording-history-list';
		
		// Tri du plus récent au plus ancien (déjà fait dans l'index)
		recordings.forEach((recording: any) => {
			console.log('Creating card for recording:', recording);
			this.createRecordingCard(recording);
		});
		
		console.log(`Historique mis à jour: ${recordings.length} enregistrements affichés`);
	}


	formatDuration(milliseconds: number): string {
		const minutes = Math.floor(milliseconds / 60000);
		const seconds = Math.floor((milliseconds % 60000) / 1000);
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}

	createRecordingCard(recording: any) {
		console.log('Creating card for:', recording.title);
		
		const card = this.historyList.createDiv('ai-recording-card');
		card.setAttribute('data-recording-id', recording.id);
		
		// Header de la carte (collapsible)
		const header = card.createDiv('ai-recording-card-header');
		header.onclick = () => this.toggleCardExpansion(card);
		
		// Container principal du header
		const headerMain = header.createDiv('ai-recording-header-main');
		
		// Titre en primaire avec icône d'expansion
		const titleRow = headerMain.createDiv('ai-recording-card-title-row');
		const expandIcon = titleRow.createEl('span', { text: '▶' });
		expandIcon.addClass('ai-recording-expand-icon');
		
		const title = titleRow.createEl('h4', { text: recording.title });
		title.addClass('ai-recording-card-title');
		
		// Métadonnées secondaires (date + durée)
		const meta = headerMain.createDiv('ai-recording-card-meta');
		const dateText = meta.createEl('span', { text: recording.date });
		dateText.addClass('ai-recording-meta-text');
		const separator = meta.createEl('span', { text: ' • ' });
		separator.addClass('ai-recording-meta-separator');
		const durationText = meta.createEl('span', { text: this.formatDuration(recording.duration) });
		durationText.addClass('ai-recording-meta-text');
		
		// Statut de traitement si applicable (dans la carte)
		const statusBadge = headerMain.createDiv('ai-recording-status-badge');
		statusBadge.setAttribute('data-recording-id', recording.id);
		
		if (recording.status === 'processing') {
			statusBadge.addClass('ai-recording-status-processing-badge');
			statusBadge.textContent = '⏳ Traitement en cours...';
		} else if (recording.status === 'error') {
			statusBadge.addClass('ai-recording-status-error-badge');
			statusBadge.textContent = '❌ Erreur';
		} else if (recording.status === 'completed') {
			statusBadge.addClass('ai-recording-status-completed-badge');
			statusBadge.textContent = '✓ Terminé';
		} else if (recording.status === 'pending') {
			statusBadge.addClass('ai-recording-status-pending-badge');
			statusBadge.textContent = '⏸️ En attente';
		}
		
		// Actions dans le header
		const headerActions = header.createDiv('ai-recording-card-header-actions');
		
		if (recording.audioFile) {
			const playButton = headerActions.createEl('button', { text: '▶️' });
			playButton.addClass('ai-recording-action-btn');
			playButton.title = 'Écouter';
			playButton.onclick = (e) => {
				e.stopPropagation();
				this.playRecording(recording);
			};
		}
		
		const deleteButton = headerActions.createEl('button', { text: '🗑️' });
		deleteButton.addClass('ai-recording-action-btn');
		deleteButton.title = 'Supprimer';
		deleteButton.onclick = (e) => {
			e.stopPropagation();
			this.confirmDeleteRecording(recording);
		};
		
		// Contenu collapsible
		const content = card.createDiv('ai-recording-card-content');
		content.addClass('ai-recording-card-content-collapsed');
		
		// Onglets Summary/Transcript
		const tabs = content.createDiv('ai-recording-card-tabs');
		const tabButtons = tabs.createDiv('ai-recording-tab-buttons');
		
		const summaryTab = tabButtons.createEl('button', { text: 'Summary' });
		summaryTab.addClass('ai-recording-tab-btn', 'ai-recording-tab-active');
		summaryTab.setAttribute('data-tab', 'summary');
		summaryTab.onclick = () => this.switchTab(card, 'summary');
		
		const transcriptTab = tabButtons.createEl('button', { text: 'Transcript' });
		transcriptTab.addClass('ai-recording-tab-btn');
		transcriptTab.setAttribute('data-tab', 'transcript');
		transcriptTab.onclick = () => this.switchTab(card, 'transcript');
		
		// Contenu des onglets
		const tabContent = content.createDiv('ai-recording-tab-content');
		
		// Onglet Summary
		const summaryContent = tabContent.createDiv('ai-recording-summary-content');
		summaryContent.addClass('ai-recording-tab-panel', 'ai-recording-tab-panel-active');
		
		// Charger le résumé depuis le fichier si disponible
		if (recording.summaryFile) {
			this.loadSummaryContent(recording.summaryFile, summaryContent);
		} else {
			summaryContent.textContent = 'Aucun résumé disponible';
		}
		
		// Onglet Transcript
		const transcriptContent = tabContent.createDiv('ai-recording-transcript-content');
		transcriptContent.addClass('ai-recording-tab-panel');
		
		// Charger la transcription depuis le fichier si disponible
		if (recording.transcriptFile) {
			this.loadTranscriptContent(recording.transcriptFile, transcriptContent);
		} else {
			transcriptContent.textContent = 'Aucune transcription disponible';
		}
		
		// Actions dans le contenu
		const contentActions = content.createDiv('ai-recording-card-content-actions');
		
		const copyButton = contentActions.createEl('button', { text: '📋 Copier' });
		copyButton.addClass('ai-recording-action-btn', 'ai-recording-action-btn-text');
		copyButton.onclick = () => this.copyContent(card);
		
		const expandButton = contentActions.createEl('button', { text: '📄 Ouvrir' });
		expandButton.addClass('ai-recording-action-btn', 'ai-recording-action-btn-text');
		expandButton.onclick = () => this.openInNewNote(recording);

		// Bouton de retranscription si pas de transcription
		if (!recording.transcriptFile) {
			const retranscribeButton = contentActions.createEl('button', { text: '🔄 Transcrire' });
			retranscribeButton.addClass('ai-recording-action-btn', 'ai-recording-action-btn-text');
			retranscribeButton.title = 'Lancer la transcription de cet enregistrement';
			retranscribeButton.onclick = async () => {
				const confirm = window.confirm('Voulez-vous lancer la transcription de cet enregistrement ?');
				if (confirm) {
					await this.plugin.transcribeRecording(recording.id);
				}
			};
		}
		
		console.log('Card created successfully for:', recording.title);
	}

	toggleCardExpansion(card: HTMLElement) {
		console.log('Toggling card expansion for:', card.getAttribute('data-recording-id'));
		
		const content = card.querySelector('.ai-recording-card-content') as HTMLElement;
		const expandIcon = card.querySelector('.ai-recording-expand-icon') as HTMLElement;
		
		if (!content || !expandIcon) {
			console.error('Content or expandIcon not found');
			return;
		}
		
		if (content.classList.contains('ai-recording-card-content-collapsed')) {
			content.classList.remove('ai-recording-card-content-collapsed');
			content.classList.add('ai-recording-card-content-expanded');
			expandIcon.textContent = '▼';
			card.classList.add('ai-recording-card-expanded');
			console.log('Card expanded');
		} else {
			content.classList.remove('ai-recording-card-content-expanded');
			content.classList.add('ai-recording-card-content-collapsed');
			expandIcon.textContent = '▶';
			card.classList.remove('ai-recording-card-expanded');
			console.log('Card collapsed');
		}
	}

	switchTab(card: HTMLElement, tabName: string) {
		// Désactiver tous les onglets
		const tabButtons = card.querySelectorAll('.ai-recording-tab-btn');
		const tabPanels = card.querySelectorAll('.ai-recording-tab-panel');
		
		tabButtons.forEach(btn => btn.classList.remove('ai-recording-tab-active'));
		tabPanels.forEach(panel => panel.classList.remove('ai-recording-tab-panel-active'));
		
		// Activer l'onglet sélectionné
		const activeTab = card.querySelector(`.ai-recording-tab-btn[data-tab="${tabName}"]`) as HTMLElement;
		const activePanel = card.querySelector(`.ai-recording-${tabName}-content`) as HTMLElement;
		
		if (activeTab) activeTab.classList.add('ai-recording-tab-active');
		if (activePanel) activePanel.classList.add('ai-recording-tab-panel-active');
	}

	playRecording(recording: any) {
		// Pour l'instant, juste un message
		// TODO: Implémenter la lecture audio réelle
		new Notice(`Lecture de ${recording.title}`);
		console.log('Lecture de l\'enregistrement:', recording);
	}

	copyContent(card: HTMLElement) {
		const activePanel = card.querySelector('.ai-recording-tab-panel-active') as HTMLElement;
		if (activePanel) {
			const text = activePanel.textContent || '';
			navigator.clipboard.writeText(text).then(() => {
				new Notice('Contenu copié dans le presse-papiers');
			}).catch(err => {
				console.error('Erreur lors de la copie:', err);
				new Notice('Erreur lors de la copie');
			});
		}
	}

	async loadTranscriptContent(transcriptPath: string, containerEl: HTMLElement) {
		try {
			const { vault } = this.plugin.app;
			const file = vault.getAbstractFileByPath(transcriptPath);
			
			if (file && 'extension' in file) {
				const content = await vault.read(file as any);
				// Extraire seulement le texte de la transcription (sans les métadonnées)
				const lines = content.split('\n');
				const separatorIndex = lines.findIndex((line: string) => line.trim() === '---');
				const transcriptText = separatorIndex !== -1 
					? lines.slice(separatorIndex + 1).join('\n').trim()
					: content;
				containerEl.textContent = transcriptText || 'Transcription vide';
			} else {
				containerEl.textContent = 'Fichier de transcription introuvable';
			}
		} catch (error) {
			console.error('Erreur lors du chargement de la transcription:', error);
			containerEl.textContent = 'Erreur lors du chargement de la transcription';
		}
	}

	async loadSummaryContent(summaryPath: string, containerEl: HTMLElement) {
		try {
			const { vault } = this.plugin.app;
			const file = vault.getAbstractFileByPath(summaryPath);
			
			if (file && 'extension' in file) {
				const content = await vault.read(file as any);
				// Extraire seulement le texte du résumé (sans les métadonnées)
				const lines = content.split('\n');
				const separatorIndex = lines.findIndex((line: string) => line.trim() === '---');
				const summaryText = separatorIndex !== -1 
					? lines.slice(separatorIndex + 1).join('\n').trim()
					: content;
				containerEl.textContent = summaryText || 'Résumé vide';
			} else {
				containerEl.textContent = 'Fichier de résumé introuvable';
			}
		} catch (error) {
			console.error('Erreur lors du chargement du résumé:', error);
			containerEl.textContent = 'Erreur lors du chargement du résumé';
		}
	}

	async openInNewNote(recording: any) {
		try {
			// Charger le contenu de la transcription depuis le fichier
			let transcriptText = 'Aucune transcription disponible';
			if (recording.transcriptFile) {
				const transcriptFile = this.plugin.app.vault.getAbstractFileByPath(recording.transcriptFile);
				if (transcriptFile && 'extension' in transcriptFile) {
					const content = await this.plugin.app.vault.read(transcriptFile as any);
					const lines = content.split('\n');
					const separatorIndex = lines.findIndex((line: string) => line.trim() === '---');
					transcriptText = separatorIndex !== -1 
						? lines.slice(separatorIndex + 1).join('\n').trim()
						: content;
				}
			}

			// Charger le contenu du résumé depuis le fichier
			let summaryText = 'Aucun résumé disponible';
			if (recording.summaryFile) {
				const summaryFile = this.plugin.app.vault.getAbstractFileByPath(recording.summaryFile);
				if (summaryFile && 'extension' in summaryFile) {
					const content = await this.plugin.app.vault.read(summaryFile as any);
					const lines = content.split('\n');
					const separatorIndex = lines.findIndex((line: string) => line.trim() === '---');
					summaryText = separatorIndex !== -1 
						? lines.slice(separatorIndex + 1).join('\n').trim()
						: content;
				}
			}

			// Créer le contenu de la note combinée
			const content = `# ${recording.title}

**Date:** ${recording.date}
**Durée:** ${this.formatDuration(recording.duration)}

## 🎵 Audio

![[${recording.audioFile}]]

---

## 📝 Résumé

${summaryText}

---

## 📄 Transcription Complète

${transcriptText}

---

*Note générée automatiquement par AI Recording Plugin*
`;

			// Créer la note dans le même dossier que l'audio
			// Extraire le dossier depuis le chemin du fichier audio
			const audioPath = recording.audioFile || '';
			const folderPath = audioPath.substring(0, audioPath.lastIndexOf('/'));
			const baseFileName = audioPath.substring(audioPath.lastIndexOf('/') + 1).replace('.webm', '');
			const noteName = `${folderPath}/${baseFileName}_combined.md`;
			
			const existingFile = this.plugin.app.vault.getAbstractFileByPath(noteName);
			
			if (existingFile) {
				// Si la note existe déjà, demander confirmation
				const confirmOverwrite = confirm(`La note "${baseFileName}_combined.md" existe déjà. Voulez-vous la remplacer ?`);
				if (!confirmOverwrite) {
					return;
				}
				await this.plugin.app.vault.modify(existingFile as any, content);
			} else {
				await this.plugin.app.vault.create(noteName, content);
			}

			// Ouvrir la note
			await this.plugin.app.workspace.openLinkText(noteName, '', true);
			new Notice('Note combinée créée avec succès !');

		} catch (error) {
			console.error('Erreur lors de la création de la note:', error);
			new Notice('Erreur lors de la création de la note combinée');
		}
	}


	confirmDeleteRecording(recording: any) {
		const modal = document.createElement('div');
		modal.className = 'ai-recording-modal';
		modal.innerHTML = `
			<div class="ai-recording-modal-content">
				<h3>Supprimer l'enregistrement</h3>
				<p>Êtes-vous sûr de vouloir supprimer "${recording.title}" ?</p>
				<p class="ai-recording-modal-warning">Cette action est irréversible.</p>
				<div class="ai-recording-modal-buttons">
					<button class="ai-recording-btn ai-recording-btn-danger" id="confirm-delete-recording">Supprimer</button>
					<button class="ai-recording-btn ai-recording-btn-secondary" id="cancel-delete-recording">Annuler</button>
				</div>
			</div>
		`;
		document.body.appendChild(modal);

		modal.querySelector('#confirm-delete-recording')?.addEventListener('click', async () => {
			await this.plugin.deleteRecordingFromIndex(recording.id);
			this.updateHistoryList();
			document.body.removeChild(modal);
		});

		modal.querySelector('#cancel-delete-recording')?.addEventListener('click', () => {
			document.body.removeChild(modal);
		});
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

			.ai-recording-state.uploading {
				background: #2196f3;
				color: white;
			}

			.ai-recording-state.transcribing {
				background: #9c27b0;
				color: white;
			}

			.ai-recording-state.summarizing {
				background: #00bcd4;
				color: white;
			}

			.ai-recording-timer {
				font-size: 24px;
				font-weight: bold;
				color: var(--text-normal);
				margin-bottom: 16px;
				font-family: monospace;
			}

			.ai-recording-transcription-status {
				font-size: 13px;
				color: var(--text-muted);
				margin-bottom: 12px;
				padding: 8px;
				background: var(--background-primary);
				border-radius: 4px;
				border: 1px solid var(--background-modifier-border);
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

			.ai-recording-history-empty {
				color: var(--text-muted);
				font-style: italic;
				text-align: center;
				padding: 20px;
			}

			.ai-recording-card {
				background: var(--background-primary);
				border: 1px solid var(--background-modifier-border);
				border-radius: 8px;
				margin-bottom: 12px;
				transition: all 0.3s ease;
				overflow: hidden;
			}

			.ai-recording-card:hover {
				border-color: var(--background-modifier-border-hover);
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
			}

			.ai-recording-card-expanded {
				border-color: var(--interactive-accent);
			}

			.ai-recording-card-header {
				padding: 12px 16px;
				cursor: pointer;
				transition: background 0.2s ease;
				display: flex;
				justify-content: space-between;
				align-items: flex-start;
			}

			.ai-recording-card-header:hover {
				background: var(--background-secondary);
			}

			.ai-recording-header-main {
				flex: 1;
				display: flex;
				flex-direction: column;
				gap: 4px;
			}

			.ai-recording-card-title-row {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.ai-recording-expand-icon {
				font-size: 10px;
				color: var(--text-muted);
				transition: transform 0.2s ease;
				margin-top: 2px;
			}

			.ai-recording-card-title {
				margin: 0;
				font-size: 16px;
				font-weight: 600;
				color: var(--text-normal);
				line-height: 1.3;
			}

			.ai-recording-card-meta {
				display: flex;
				align-items: center;
				gap: 4px;
				margin-left: 18px;
			}

			.ai-recording-meta-text {
				font-size: 12px;
				color: var(--text-muted);
				font-weight: 400;
			}

			.ai-recording-meta-separator {
				font-size: 12px;
				color: var(--text-faint);
			}

			.ai-recording-status-badge {
				margin-left: 18px;
				margin-top: 4px;
				padding: 4px 10px;
				border-radius: 12px;
				font-size: 11px;
				font-weight: 500;
				display: inline-block;
				width: fit-content;
			}

			.ai-recording-status-processing-badge {
				background: #ff9800;
				color: white;
				animation: pulse 2s ease-in-out infinite;
			}

			.ai-recording-status-error-badge {
				background: #f44336;
				color: white;
			}

			.ai-recording-status-completed-badge {
				background: #4caf50;
				color: white;
			}

			.ai-recording-status-pending-badge {
				background: #9e9e9e;
				color: white;
			}

			@keyframes pulse {
				0%, 100% { opacity: 1; }
				50% { opacity: 0.6; }
			}

			.ai-recording-status {
				padding: 2px 8px;
				border-radius: 12px;
				font-size: 11px;
				font-weight: 500;
			}

			.ai-recording-status-completed {
				background: #4caf50;
				color: white;
			}

			.ai-recording-status-processing {
				background: #ff9800;
				color: white;
			}

			.ai-recording-status-error {
				background: #f44336;
				color: white;
			}

			.ai-recording-card-header-actions {
				display: flex;
				gap: 4px;
				margin-left: 12px;
			}

			.ai-recording-card-content {
				border-top: 1px solid var(--background-modifier-border);
				background: var(--background-secondary);
				transition: all 0.3s ease;
			}

			.ai-recording-card-content-collapsed {
				max-height: 0;
				overflow: hidden;
				padding: 0 16px;
				opacity: 0;
				transition: all 0.3s ease;
			}

			.ai-recording-card-content-expanded {
				max-height: 500px;
				padding: 16px;
				opacity: 1;
				transition: all 0.3s ease;
			}

			.ai-recording-card-tabs {
				margin-bottom: 16px;
			}

			.ai-recording-tab-buttons {
				display: flex;
				gap: 4px;
				margin-bottom: 12px;
			}

			.ai-recording-tab-btn {
				padding: 6px 12px;
				border: none;
				background: var(--background-primary);
				color: var(--text-muted);
				border-radius: 4px;
				font-size: 12px;
				font-weight: 500;
				cursor: pointer;
				transition: all 0.2s ease;
			}

			.ai-recording-tab-btn:hover {
				background: var(--background-modifier-border);
				color: var(--text-normal);
			}

			.ai-recording-tab-active {
				background: var(--interactive-accent);
				color: white;
			}

			.ai-recording-tab-panel {
				display: none;
				padding: 12px;
				background: var(--background-primary);
				border-radius: 6px;
				border: 1px solid var(--background-modifier-border);
				font-size: 13px;
				line-height: 1.5;
				color: var(--text-normal);
				max-height: 200px;
				overflow-y: auto;
			}

			.ai-recording-tab-panel-active {
				display: block;
			}

			.ai-recording-card-content-actions {
				display: flex;
				gap: 8px;
				justify-content: flex-end;
				margin-top: 12px;
			}

			.ai-recording-action-btn {
				background: none;
				border: none;
				padding: 6px;
				cursor: pointer;
				border-radius: 4px;
				font-size: 14px;
				transition: background 0.2s ease;
			}

			.ai-recording-action-btn:hover {
				background: var(--background-modifier-border);
			}

			.ai-recording-action-btn-text {
				font-size: 12px;
				padding: 6px 12px;
				background: var(--background-primary);
				border: 1px solid var(--background-modifier-border);
			}

			.ai-recording-action-btn-text:hover {
				background: var(--background-modifier-border-hover);
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
