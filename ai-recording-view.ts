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
		
		// Nettoyer les données de test si nécessaire
		this.clearTestRecordings();
		
		const recordings = this.plugin.getRecordingsIndex();
		console.log('Recordings from index:', recordings);
		
		// Ajouter des données de test SEULEMENT si aucun enregistrement ET pas de données de test déjà présentes
		if (recordings.length === 0 && !this.hasTestRecordings()) {
			console.log('Aucun enregistrement trouvé, ajout de données de test');
			this.addTestRecordings();
			const testRecordings = this.plugin.getRecordingsIndex();
			console.log('Test recordings:', testRecordings);
		}
		
		const finalRecordings = this.plugin.getRecordingsIndex();
		
		if (finalRecordings.length === 0) {
			this.historyList.textContent = 'Aucun enregistrement pour le moment';
			this.historyList.className = 'ai-recording-history-list ai-recording-history-empty';
			return;
		}
		
		this.historyList.className = 'ai-recording-history-list';
		
		// Tri du plus récent au plus ancien (déjà fait dans l'index)
		finalRecordings.forEach((recording: any) => {
			console.log('Creating card for recording:', recording);
			this.createRecordingCard(recording);
		});
		
		console.log(`Historique mis à jour: ${finalRecordings.length} enregistrements affichés`);
	}

	hasTestRecordings(): boolean {
		// Vérifier si des données de test sont déjà présentes
		const recordings = this.plugin.getRecordingsIndex();
		return recordings.some((recording: any) => recording.id.startsWith('test-'));
	}

	addTestRecordings() {
		// Ajouter des enregistrements de test pour diagnostiquer
		const testRecordings = [
			{
				id: 'test-1',
				title: 'Test Recording 1',
				date: '2025-10-02',
				duration: 120000, // 2 minutes
				status: 'completed',
				audioFile: 'test-audio-1.webm',
				summary: 'Ceci est un résumé de test pour diagnostiquer l\'affichage des cartes.',
				transcript: 'Ceci est une transcription de test pour vérifier que les onglets fonctionnent correctement.',
				segments: [] as Array<{start: number, end: number}>,
				createdAt: Date.now() - 3600000, // 1 heure ago
				updatedAt: Date.now() - 3600000
			},
			{
				id: 'test-2',
				title: 'Test Recording 2',
				date: '2025-10-02',
				duration: 180000, // 3 minutes
				status: 'processing',
				audioFile: 'test-audio-2.webm',
				summary: 'Résumé de test numéro 2 avec du contenu plus long pour tester l\'affichage des cartes expansibles.',
				transcript: 'Transcription de test numéro 2 avec plusieurs lignes de texte pour vérifier le scroll et l\'affichage correct.',
				segments: [] as Array<{start: number, end: number}>,
				createdAt: Date.now() - 7200000, // 2 heures ago
				updatedAt: Date.now() - 7200000
			}
		];
		
		// Ajouter les enregistrements de test à l'index
		this.plugin.recordingsIndex = testRecordings;
		this.plugin.saveRecordingsIndex();
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
		
		// Titre avec icône d'expansion
		const titleRow = header.createDiv('ai-recording-card-title-row');
		const expandIcon = titleRow.createEl('span', { text: '▶' });
		expandIcon.addClass('ai-recording-expand-icon');
		
		const title = titleRow.createEl('h5', { text: recording.title });
		title.addClass('ai-recording-card-title');
		
		// Métadonnées
		const meta = header.createDiv('ai-recording-card-meta');
		meta.createEl('span', { text: recording.date, cls: 'ai-recording-date' });
		meta.createEl('span', { text: this.formatDuration(recording.duration), cls: 'ai-recording-duration' });
		meta.createEl('span', { text: recording.status, cls: `ai-recording-status ai-recording-status-${recording.status}` });
		
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
		summaryContent.textContent = recording.summary || 'Aucun résumé disponible';
		
		// Onglet Transcript
		const transcriptContent = tabContent.createDiv('ai-recording-transcript-content');
		transcriptContent.addClass('ai-recording-tab-panel');
		transcriptContent.textContent = recording.transcript || 'Aucune transcription disponible';
		
		// Actions dans le contenu
		const contentActions = content.createDiv('ai-recording-card-content-actions');
		
		const copyButton = contentActions.createEl('button', { text: '📋 Copier' });
		copyButton.addClass('ai-recording-action-btn', 'ai-recording-action-btn-text');
		copyButton.onclick = () => this.copyContent(card);
		
		const expandButton = contentActions.createEl('button', { text: '📄 Ouvrir' });
		expandButton.addClass('ai-recording-action-btn', 'ai-recording-action-btn-text');
		expandButton.onclick = () => this.openInNewNote(recording);
		
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

	openInNewNote(recording: any) {
		// Créer une nouvelle note avec le contenu de l'enregistrement
		const content = `# ${recording.title}\n\n**Date:** ${recording.date}\n**Durée:** ${this.formatDuration(recording.duration)}\n\n## Résumé\n\n${recording.summary || 'Aucun résumé disponible'}\n\n## Transcription\n\n${recording.transcript || 'Aucune transcription disponible'}`;
		
		// Ouvrir une nouvelle note dans Obsidian
		const newFile = this.plugin.app.vault.create(`${recording.title}.md`, content);
		if (newFile) {
			this.plugin.app.workspace.openLinkText(newFile.path, '', true);
			new Notice('Note créée avec le contenu de l\'enregistrement');
		}
	}

	clearTestRecordings() {
		// Nettoyer les données de test quand de vrais enregistrements sont ajoutés
		const recordings = this.plugin.getRecordingsIndex();
		const realRecordings = recordings.filter((recording: any) => !recording.id.startsWith('test-'));
		
		if (realRecordings.length > 0 && recordings.length !== realRecordings.length) {
			console.log('Nettoyage des données de test, conservation des vrais enregistrements');
			this.plugin.recordingsIndex = realRecordings;
			this.plugin.saveRecordingsIndex();
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
				align-items: center;
			}

			.ai-recording-card-header:hover {
				background: var(--background-secondary);
			}

			.ai-recording-card-title-row {
				display: flex;
				align-items: center;
				gap: 8px;
				flex: 1;
			}

			.ai-recording-expand-icon {
				font-size: 12px;
				color: var(--text-muted);
				transition: transform 0.2s ease;
			}

			.ai-recording-card-title {
				margin: 0;
				font-size: 14px;
				font-weight: 600;
				color: var(--text-normal);
			}

			.ai-recording-card-meta {
				display: flex;
				gap: 12px;
				font-size: 12px;
				color: var(--text-muted);
				margin-left: 16px;
			}

			.ai-recording-date {
				font-weight: 500;
			}

			.ai-recording-duration {
				font-family: monospace;
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
