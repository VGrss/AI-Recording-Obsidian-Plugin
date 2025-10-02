import { Plugin, Notice } from 'obsidian';

export default class AIRecordingPlugin extends Plugin {
	async onload() {
		console.log('Plugin AI Recording chargé');
		new Notice('Plugin AI Recording chargé avec succès');
	}

	onunload() {
		console.log('Plugin AI Recording déchargé');
	}
}
