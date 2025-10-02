import { Plugin, TFile, Notice, PluginSettingTab, Setting, App } from 'obsidian';

interface AIRecordingSettings {
	apiKey: string;
	model: string;
	language: string;
	autoTranscribe: boolean;
	saveAudioFiles: boolean;
}

const DEFAULT_SETTINGS: AIRecordingSettings = {
	apiKey: '',
	model: 'whisper-1',
	language: 'fr',
	autoTranscribe: true,
	saveAudioFiles: true
};

export default class AIRecordingPlugin extends Plugin {
	settings: AIRecordingSettings;
	recorder: MediaRecorder | null = null;
	isRecording: boolean = false;
	audioChunks: Blob[] = [];

	async onload() {
		await this.loadSettings();

		// Ajouter la commande d'enregistrement
		this.addCommand({
			id: 'start-recording',
			name: 'Commencer l\'enregistrement audio',
			callback: () => this.startRecording()
		});

		this.addCommand({
			id: 'stop-recording',
			name: 'Arrêter l\'enregistrement audio',
			callback: () => this.stopRecording()
		});

		// Ajouter le bouton dans la barre d'outils
		this.addRibbonIcon('mic', 'Enregistrement IA', () => {
			if (this.isRecording) {
				this.stopRecording();
			} else {
				this.startRecording();
			}
		});

		// Ajouter les paramètres
		this.addSettingTab(new AIRecordingSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async startRecording() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			this.recorder = new MediaRecorder(stream);
			this.audioChunks = [];

			this.recorder.ondataavailable = (event) => {
				this.audioChunks.push(event.data);
			};

			this.recorder.onstop = () => {
				this.processRecording();
			};

			this.recorder.start();
			this.isRecording = true;
			new Notice('Enregistrement démarré');
		} catch (error) {
			new Notice('Erreur lors du démarrage de l\'enregistrement: ' + error);
		}
	}

	async stopRecording() {
		if (this.recorder && this.isRecording) {
			this.recorder.stop();
			this.isRecording = false;
			new Notice('Enregistrement arrêté');
		}
	}

	async processRecording() {
		if (this.audioChunks.length === 0) return;

		const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
		
		if (this.settings.saveAudioFiles) {
			await this.saveAudioFile(audioBlob);
		}

		if (this.settings.autoTranscribe && this.settings.apiKey) {
			await this.transcribeAudio(audioBlob);
		}
	}

	async saveAudioFile(audioBlob: Blob) {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const fileName = `Enregistrement_${timestamp}.wav`;
		
		const file = await this.app.vault.createBinary(fileName, await audioBlob.arrayBuffer());
		new Notice(`Fichier audio sauvegardé: ${fileName}`);
	}

	async transcribeAudio(audioBlob: Blob) {
		try {
			const formData = new FormData();
			formData.append('file', audioBlob, 'recording.wav');
			formData.append('model', this.settings.model);
			formData.append('language', this.settings.language);

			const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.settings.apiKey}`
				},
				body: formData
			});

			if (!response.ok) {
				throw new Error(`Erreur API: ${response.status}`);
			}

			const result = await response.json();
			await this.createTranscriptionNote(result.text);
			
		} catch (error) {
			new Notice('Erreur lors de la transcription: ' + error);
		}
	}

	async createTranscriptionNote(text: string) {
		const timestamp = new Date().toISOString();
		const fileName = `Transcription_${timestamp.split('T')[0]}.md`;
		
		const content = `# Transcription Audio - ${timestamp}

${text}

---
*Généré automatiquement par le plugin AI Recording*`;

		await this.app.vault.create(fileName, content);
		new Notice('Transcription créée avec succès');
	}
}

class AIRecordingSettingTab extends PluginSettingTab {
	plugin: AIRecordingPlugin;

	constructor(app: App, plugin: AIRecordingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Paramètres du Plugin AI Recording' });

		new Setting(containerEl)
			.setName('Clé API OpenAI')
			.setDesc('Votre clé API OpenAI pour la transcription')
			.addText((text: any) => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value: string) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Modèle de transcription')
			.setDesc('Modèle à utiliser pour la transcription')
			.addDropdown((dropdown: any) => dropdown
				.addOption('whisper-1', 'Whisper-1')
				.setValue(this.plugin.settings.model)
				.onChange(async (value: string) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Langue')
			.setDesc('Langue de l\'audio à transcrire')
			.addDropdown((dropdown: any) => dropdown
				.addOption('fr', 'Français')
				.addOption('en', 'Anglais')
				.addOption('es', 'Espagnol')
				.addOption('de', 'Allemand')
				.setValue(this.plugin.settings.language)
				.onChange(async (value: string) => {
					this.plugin.settings.language = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Transcription automatique')
			.setDesc('Transcrire automatiquement après l\'enregistrement')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.autoTranscribe)
				.onChange(async (value: boolean) => {
					this.plugin.settings.autoTranscribe = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Sauvegarder les fichiers audio')
			.setDesc('Conserver les fichiers audio dans le vault')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.saveAudioFiles)
				.onChange(async (value: boolean) => {
					this.plugin.settings.saveAudioFiles = value;
					await this.plugin.saveSettings();
				}));
	}
}
