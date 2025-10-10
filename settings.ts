import { App, PluginSettingTab, Setting } from 'obsidian';
import AIRecordingPlugin from './main';

export interface AIRecordingSettings {
	// Transcription Settings
	transcriptionProvider: 'openai' | 'local';
	transcriptionModel: string;
	transcriptionLanguage: 'auto' | 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'nl' | 'pl' | 'ru' | 'ja' | 'zh';
	transcriptionMode: 'fast' | 'quality';
	openaiApiKey: string;
	
	// Summary Settings
	summaryProvider: 'openai' | 'anthropic' | 'local';
	summaryModel: string;
	summaryTemplate: string;
	summaryLength: 'short' | 'medium' | 'long';
	anthropicApiKey: string;
	
	// Export Settings
	audioFormat: 'webm' | 'm4a';
	transcriptFormat: 'txt' | 'md';
	summaryFormat: 'md';
	organizeByDate: boolean;
	autoChunking: boolean;
	chunkSizeLimit: number; // in MB
	
	// Misc Settings
	showInitialWarning: boolean;
	deleteOriginalAfterDays: number; // 0 = never
	recordingsFolder: string;
	
	// Keyboard Shortcuts (stored as reference, actual shortcuts in manifest)
	enableShortcuts: boolean;
}

export const DEFAULT_SETTINGS: AIRecordingSettings = {
	// Transcription
	transcriptionProvider: 'openai',
	transcriptionModel: 'whisper-1',
	transcriptionLanguage: 'auto',
	transcriptionMode: 'quality',
	openaiApiKey: '',
	
	// Summary
	summaryProvider: 'openai',
	summaryModel: 'gpt-4o',
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
	anthropicApiKey: '',
	
	// Export
	audioFormat: 'webm',
	transcriptFormat: 'md',
	summaryFormat: 'md',
	organizeByDate: true,
	autoChunking: true,
	chunkSizeLimit: 25, // 25 MB
	
	// Misc
	showInitialWarning: true,
	deleteOriginalAfterDays: 0, // Never delete by default
	recordingsFolder: 'AI Recordings',
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

		// ==================== HEADER ====================
		containerEl.createEl('h1', { text: 'AI Recording - Paramètres' });
		containerEl.createEl('p', { 
			text: 'Configurez les paramètres de transcription, résumé et export pour vos enregistrements audio.',
			cls: 'setting-item-description'
		});

		// ==================== TRANSCRIPTION SECTION ====================
		containerEl.createEl('h2', { text: '🎤 Transcription' });

		new Setting(containerEl)
			.setName('Provider de transcription')
			.setDesc('Choisissez le service de transcription')
			.addDropdown(dropdown => dropdown
				.addOption('openai', 'OpenAI Whisper (Cloud)')
				.addOption('local', 'Whisper Local (CPU/GPU)')
				.setValue(this.plugin.settings.transcriptionProvider)
				.onChange(async (value: 'openai' | 'local') => {
					this.plugin.settings.transcriptionProvider = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide API key
				}));

		// OpenAI API Key (only if OpenAI is selected)
		if (this.plugin.settings.transcriptionProvider === 'openai') {
			new Setting(containerEl)
				.setName('Clé API OpenAI')
				.setDesc('Votre clé API OpenAI pour la transcription Whisper')
				.addText(text => text
					.setPlaceholder('sk-...')
					.setValue(this.plugin.settings.openaiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openaiApiKey = value;
						await this.plugin.saveSettings();
					}));
		}

		new Setting(containerEl)
			.setName('Modèle de transcription')
			.setDesc('Modèle utilisé pour la transcription')
			.addDropdown(dropdown => {
				if (this.plugin.settings.transcriptionProvider === 'openai') {
					dropdown.addOption('whisper-1', 'Whisper v1');
				} else {
					dropdown
						.addOption('base', 'Whisper Base (rapide)')
						.addOption('small', 'Whisper Small')
						.addOption('medium', 'Whisper Medium')
						.addOption('large', 'Whisper Large (meilleur)');
				}
				dropdown
					.setValue(this.plugin.settings.transcriptionModel)
					.onChange(async (value) => {
						this.plugin.settings.transcriptionModel = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Langue')
			.setDesc('Langue de la transcription (auto-détection recommandée)')
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

		new Setting(containerEl)
			.setName('Mode de transcription')
			.setDesc('Rapide pour des résultats plus rapides, Qualité pour une meilleure précision')
			.addDropdown(dropdown => dropdown
				.addOption('fast', 'Rapide')
				.addOption('quality', 'Qualité')
				.setValue(this.plugin.settings.transcriptionMode)
				.onChange(async (value: 'fast' | 'quality') => {
					this.plugin.settings.transcriptionMode = value;
					await this.plugin.saveSettings();
				}));

		// ==================== SUMMARY SECTION ====================
		containerEl.createEl('h2', { text: '🤖 Résumé IA' });

		new Setting(containerEl)
			.setName('Provider de résumé')
			.setDesc('Choisissez le service de génération de résumé')
			.addDropdown(dropdown => dropdown
				.addOption('openai', 'OpenAI GPT')
				.addOption('anthropic', 'Anthropic Claude')
				.addOption('local', 'LLM Local')
				.setValue(this.plugin.settings.summaryProvider)
				.onChange(async (value: 'openai' | 'anthropic' | 'local') => {
					this.plugin.settings.summaryProvider = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show appropriate fields
				}));

		// API Keys based on provider
		if (this.plugin.settings.summaryProvider === 'openai') {
			new Setting(containerEl)
				.setName('Clé API OpenAI')
				.setDesc('Votre clé API OpenAI (peut être la même que pour la transcription)')
				.addText(text => text
					.setPlaceholder('sk-...')
					.setValue(this.plugin.settings.openaiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openaiApiKey = value;
						await this.plugin.saveSettings();
					}));
		} else if (this.plugin.settings.summaryProvider === 'anthropic') {
			new Setting(containerEl)
				.setName('Clé API Anthropic')
				.setDesc('Votre clé API Anthropic pour Claude')
				.addText(text => text
					.setPlaceholder('sk-ant-...')
					.setValue(this.plugin.settings.anthropicApiKey)
					.onChange(async (value) => {
						this.plugin.settings.anthropicApiKey = value;
						await this.plugin.saveSettings();
					}));
		}

		new Setting(containerEl)
			.setName('Modèle de résumé')
			.setDesc('Modèle utilisé pour générer les résumés')
			.addDropdown(dropdown => {
				if (this.plugin.settings.summaryProvider === 'openai') {
					dropdown
						.addOption('gpt-4o', 'GPT-4o (recommandé)')
						.addOption('gpt-4o-mini', 'GPT-4o Mini')
						.addOption('gpt-4-turbo', 'GPT-4 Turbo')
						.addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo');
				} else if (this.plugin.settings.summaryProvider === 'anthropic') {
					dropdown
						.addOption('claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet (recommandé)')
						.addOption('claude-3-opus-20240229', 'Claude 3 Opus')
						.addOption('claude-3-sonnet-20240229', 'Claude 3 Sonnet')
						.addOption('claude-3-haiku-20240307', 'Claude 3 Haiku');
				} else {
					dropdown
						.addOption('llama-3-70b', 'Llama 3 70B')
						.addOption('mixtral-8x7b', 'Mixtral 8x7B')
						.addOption('custom', 'Custom');
				}
				dropdown
					.setValue(this.plugin.settings.summaryModel)
					.onChange(async (value) => {
						this.plugin.settings.summaryModel = value;
						await this.plugin.saveSettings();
					});
			});

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
			.setDesc('Template utilisé pour générer le résumé. Variables disponibles: {{transcript}}, {{language}}, {{datetime}}, {{duration}}, {{title}}')
			.addTextArea(text => text
				.setPlaceholder(DEFAULT_SETTINGS.summaryTemplate)
				.setValue(this.plugin.settings.summaryTemplate)
				.onChange(async (value) => {
					this.plugin.settings.summaryTemplate = value;
					await this.plugin.saveSettings();
				}))
			.then(setting => {
				// Make textarea larger
				const textarea = setting.controlEl.querySelector('textarea');
				if (textarea) {
					textarea.rows = 15;
					textarea.style.width = '100%';
				}
				
				// Add reset button
				setting.addButton(button => button
					.setButtonText('Réinitialiser')
					.setTooltip('Restaurer le template par défaut')
					.onClick(async () => {
						this.plugin.settings.summaryTemplate = DEFAULT_SETTINGS.summaryTemplate;
						await this.plugin.saveSettings();
						this.display();
					}));
			});

		// ==================== EXPORT SECTION ====================
		containerEl.createEl('h2', { text: '📁 Export et Fichiers' });

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
			.setName('Format audio')
			.setDesc('Format des fichiers audio enregistrés')
			.addDropdown(dropdown => dropdown
				.addOption('webm', 'WebM (recommandé)')
				.addOption('m4a', 'M4A')
				.setValue(this.plugin.settings.audioFormat)
				.onChange(async (value: 'webm' | 'm4a') => {
					this.plugin.settings.audioFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Format de transcription')
			.setDesc('Format des fichiers de transcription')
			.addDropdown(dropdown => dropdown
				.addOption('md', 'Markdown (.md)')
				.addOption('txt', 'Texte brut (.txt)')
				.setValue(this.plugin.settings.transcriptFormat)
				.onChange(async (value: 'txt' | 'md') => {
					this.plugin.settings.transcriptFormat = value;
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

		new Setting(containerEl)
			.setName('Découpage automatique')
			.setDesc('Découper automatiquement les fichiers lourds en segments')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoChunking)
				.onChange(async (value) => {
					this.plugin.settings.autoChunking = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Taille maximale des segments')
			.setDesc('Taille maximale d\'un segment en MB (si découpage activé)')
			.addSlider(slider => slider
				.setLimits(10, 100, 5)
				.setValue(this.plugin.settings.chunkSizeLimit)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.chunkSizeLimit = value;
					await this.plugin.saveSettings();
				}));

		// ==================== MISC SECTION ====================
		containerEl.createEl('h2', { text: '⚙️ Divers' });

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
			.setName('Suppression automatique des fichiers audio')
			.setDesc('Supprimer automatiquement les fichiers audio originaux après N jours (0 = jamais)')
			.addSlider(slider => slider
				.setLimits(0, 90, 1)
				.setValue(this.plugin.settings.deleteOriginalAfterDays)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.deleteOriginalAfterDays = value;
					await this.plugin.saveSettings();
				}))
			.then(setting => {
				const valueDisplay = setting.controlEl.createEl('span', {
					text: this.plugin.settings.deleteOriginalAfterDays === 0 
						? ' (jamais)' 
						: ` (${this.plugin.settings.deleteOriginalAfterDays} jours)`
				});
				valueDisplay.style.marginLeft = '10px';
				valueDisplay.style.color = 'var(--text-muted)';
			});

		new Setting(containerEl)
			.setName('Activer les raccourcis clavier')
			.setDesc('Activer les raccourcis clavier pour les actions rapides')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableShortcuts)
				.onChange(async (value) => {
					this.plugin.settings.enableShortcuts = value;
					await this.plugin.saveSettings();
				}));

		// ==================== FOOTER ====================
		containerEl.createEl('div', { 
			text: '💡 Astuce : Les paramètres sont sauvegardés automatiquement',
			cls: 'setting-item-description'
		}).style.marginTop = '20px';
	}
}

