import { App, PluginSettingTab, Setting } from 'obsidian';
import AIRecordingPlugin from './main';

export interface AIRecordingSettings {
	// Transcription (whisper.cpp server local)
	whisperUrl: string;
	transcriptionLanguage: 'auto' | 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'nl' | 'pl' | 'ru' | 'ja' | 'zh';

	// Résumé (Ollama local, modèle Llama)
	ollamaUrl: string;
	llmModel: string;
	summaryTemplate: string;
	summaryLength: 'short' | 'medium' | 'long';

	// Traitement
	autoProcess: boolean;
	captureLogs: boolean;

	// Fichiers
	recordingsFolder: string;
	organizeByDate: boolean;

	// Divers
	showInitialWarning: boolean;
	enableShortcuts: boolean;
}

export const DEFAULT_SETTINGS: AIRecordingSettings = {
	whisperUrl: 'http://127.0.0.1:8080',
	transcriptionLanguage: 'auto',

	ollamaUrl: 'http://127.0.0.1:11434',
	llmModel: 'llama3.2:3b',
	summaryTemplate: `Analyse cette transcription et génère un résumé structuré :

{{transcript}}

Organise le résumé selon ces axes :
- **Contexte** : De quoi s'agit-il ?
- **Points Clés** : Les éléments principaux abordés
- **Décisions** : Les décisions prises ou à prendre
- **Actions** : Les actions à réaliser
- **Risques/Questions** : Les points d'attention ou questions en suspens

Métadonnées :
- Date : {{datetime}}
- Durée : {{duration}}
- Langue : {{language}}`,
	summaryLength: 'medium',

	autoProcess: true,
	captureLogs: true,

	recordingsFolder: 'AI Recordings',
	organizeByDate: true,

	showInitialWarning: true,
	enableShortcuts: true,
};

export class AIRecordingSettingTab extends PluginSettingTab {
	plugin: AIRecordingPlugin;

	constructor(app: App, plugin: AIRecordingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h1', { text: 'AI Recording - Paramètres' });
		containerEl.createEl('p', {
			text: 'Traitement 100% local : Whisper pour la transcription, Llama (via Ollama) pour le résumé. Aucune donnée n\'est envoyée dans le cloud.',
			cls: 'setting-item-description'
		});

		// ==================== TRANSCRIPTION ====================
		containerEl.createEl('h2', { text: '🎤 Transcription (Whisper)' });

		new Setting(containerEl)
			.setName('URL du serveur Whisper')
			.setDesc('whisper-server (whisper.cpp) en cours d\'exécution. Le modèle Whisper se choisit au lancement du serveur (option -m).')
			.addText(text => text
				.setPlaceholder('http://127.0.0.1:8080')
				.setValue(this.plugin.settings.whisperUrl)
				.onChange(async (value) => {
					this.plugin.settings.whisperUrl = value.trim() || DEFAULT_SETTINGS.whisperUrl;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Langue')
			.setDesc('Langue de l\'audio (auto-détection recommandée)')
			.addDropdown(dropdown => dropdown
				.addOption('auto', 'Auto-détection')
				.addOption('fr', 'Français')
				.addOption('en', 'Anglais')
				.addOption('es', 'Espagnol')
				.addOption('de', 'Allemand')
				.addOption('it', 'Italien')
				.addOption('pt', 'Portugais')
				.addOption('nl', 'Néerlandais')
				.addOption('pl', 'Polonais')
				.addOption('ru', 'Russe')
				.addOption('ja', 'Japonais')
				.addOption('zh', 'Chinois')
				.setValue(this.plugin.settings.transcriptionLanguage)
				.onChange(async (value: any) => {
					this.plugin.settings.transcriptionLanguage = value;
					await this.plugin.saveSettings();
				}));

		// ==================== RÉSUMÉ ====================
		containerEl.createEl('h2', { text: '🤖 Résumé et titre (Llama)' });

		new Setting(containerEl)
			.setName('URL du serveur Ollama')
			.setDesc('Ollama en cours d\'exécution (ollama serve)')
			.addText(text => text
				.setPlaceholder('http://127.0.0.1:11434')
				.setValue(this.plugin.settings.ollamaUrl)
				.onChange(async (value) => {
					this.plugin.settings.ollamaUrl = value.trim() || DEFAULT_SETTINGS.ollamaUrl;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Modèle Llama')
			.setDesc('Nom du modèle installé dans Ollama (ollama list). Exemples : llama3.2:3b, llama3.1:8b')
			.addText(text => text
				.setPlaceholder('llama3.2:3b')
				.setValue(this.plugin.settings.llmModel)
				.onChange(async (value) => {
					this.plugin.settings.llmModel = value.trim() || DEFAULT_SETTINGS.llmModel;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Longueur du résumé')
			.setDesc('Longueur cible du résumé généré')
			.addDropdown(dropdown => dropdown
				.addOption('short', 'Court (1-2 paragraphes)')
				.addOption('medium', 'Moyen (3-5 paragraphes)')
				.addOption('long', 'Long (détaillé)')
				.setValue(this.plugin.settings.summaryLength)
				.onChange(async (value: 'short' | 'medium' | 'long') => {
					this.plugin.settings.summaryLength = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Template de prompt')
			.setDesc('Variables disponibles : {{transcript}}, {{language}}, {{datetime}}, {{duration}}, {{title}}, {{date}}')
			.addTextArea(text => text
				.setPlaceholder(DEFAULT_SETTINGS.summaryTemplate)
				.setValue(this.plugin.settings.summaryTemplate)
				.onChange(async (value) => {
					this.plugin.settings.summaryTemplate = value;
					await this.plugin.saveSettings();
				}))
			.then(setting => {
				const textarea = setting.controlEl.querySelector('textarea');
				if (textarea) {
					textarea.rows = 15;
					textarea.style.width = '100%';
				}

				setting.addButton(button => button
					.setButtonText('Réinitialiser')
					.setTooltip('Restaurer le template par défaut')
					.onClick(async () => {
						this.plugin.settings.summaryTemplate = DEFAULT_SETTINGS.summaryTemplate;
						await this.plugin.saveSettings();
						this.display();
					}));
			});

		// ==================== TRAITEMENT ====================
		containerEl.createEl('h2', { text: '⚙️ Traitement' });

		new Setting(containerEl)
			.setName('Traitement automatique')
			.setDesc('Transcrire, résumer et titrer automatiquement dès la fin de l\'enregistrement')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoProcess)
				.onChange(async (value) => {
					this.plugin.settings.autoProcess = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Conserver le journal de traitement')
			.setDesc('Écrit un journal détaillé de chaque traitement, à copier dans un agent IA pour le débogage')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.captureLogs)
				.onChange(async (value) => {
					this.plugin.settings.captureLogs = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Journal du dernier traitement')
			.setDesc('Copie dans le presse-papiers le journal complet du dernier traitement')
			.addButton(button => button
				.setButtonText('📋 Copier le journal')
				.onClick(async () => {
					await this.plugin.copyProcessingLog();
				}));

		// ==================== EXPORT ====================
		containerEl.createEl('h2', { text: '📁 Fichiers' });

		new Setting(containerEl)
			.setName('Dossier des enregistrements')
			.setDesc('Dossier où seront sauvegardés les enregistrements')
			.addText(text => text
				.setPlaceholder('AI Recordings')
				.setValue(this.plugin.settings.recordingsFolder)
				.onChange(async (value) => {
					this.plugin.settings.recordingsFolder = value || 'AI Recordings';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Organiser par date')
			.setDesc('Créer un sous-dossier par date (YYYY-MM-DD)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.organizeByDate)
				.onChange(async (value) => {
					this.plugin.settings.organizeByDate = value;
					await this.plugin.saveSettings();
				}));

		// ==================== DIVERS ====================
		containerEl.createEl('h2', { text: '🔧 Divers' });

		new Setting(containerEl)
			.setName('Afficher l\'avertissement initial')
			.setDesc('Afficher un avertissement avant le premier enregistrement')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showInitialWarning)
				.onChange(async (value) => {
					this.plugin.settings.showInitialWarning = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Activer les raccourcis clavier')
			.setDesc('Activer les raccourcis clavier pour les actions rapides')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableShortcuts)
				.onChange(async (value) => {
					this.plugin.settings.enableShortcuts = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('div', {
			text: '💡 Astuce : Les paramètres sont sauvegardés automatiquement',
			cls: 'setting-item-description'
		}).style.marginTop = '20px';
	}
}
