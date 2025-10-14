import { Notice } from 'obsidian';

export interface TranscriptionResult {
	text: string;
	language?: string;
	duration?: number;
}

export interface TranscriptionOptions {
	apiKey: string;
	model?: string;
	language?: string;
	temperature?: number;
	responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export class TranscriptionService {
	private readonly OPENAI_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
	private readonly MAX_RETRIES = 3;
	private readonly RETRY_DELAY = 2000; // 2 secondes

	async transcribeAudio(
		audioBlob: Blob,
		options: TranscriptionOptions,
		onProgress?: (status: string) => void
	): Promise<TranscriptionResult> {
		let lastError: Error | null = null;
		
		for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
			try {
				if (onProgress) {
					onProgress(`Tentative ${attempt}/${this.MAX_RETRIES}...`);
				}
				
				const result = await this.uploadAndTranscribe(audioBlob, options, onProgress);
				return result;
			} catch (error) {
				lastError = error as Error;
				console.error(`Erreur lors de la tentative ${attempt}:`, error);
				
				if (attempt < this.MAX_RETRIES) {
					if (onProgress) {
						onProgress(`Échec, nouvelle tentative dans ${this.RETRY_DELAY / 1000}s...`);
					}
					await this.delay(this.RETRY_DELAY);
				}
			}
		}
		
		throw new Error(`Échec de la transcription après ${this.MAX_RETRIES} tentatives: ${lastError?.message}`);
	}

	private async uploadAndTranscribe(
		audioBlob: Blob,
		options: TranscriptionOptions,
		onProgress?: (status: string) => void
	): Promise<TranscriptionResult> {
		// Vérifier la clé API
		if (!options.apiKey || options.apiKey.trim() === '') {
			throw new Error('Clé API OpenAI manquante. Veuillez la configurer dans les paramètres.');
		}

		// Vérifier la taille du fichier (25 MB max pour OpenAI)
		const maxSize = 25 * 1024 * 1024;
		if (audioBlob.size > maxSize) {
			throw new Error(`Fichier trop volumineux (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB). Maximum: 25 MB.`);
		}

		if (onProgress) {
			onProgress(`Upload du fichier audio (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB)...`);
		}

		// Créer le FormData
		const formData = new FormData();
		
		// Convertir le Blob en File avec le bon nom et extension
		const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type });
		formData.append('file', audioFile);
		formData.append('model', options.model || 'whisper-1');
		
		if (options.language && options.language !== 'auto') {
			formData.append('language', options.language);
		}
		
		if (options.temperature !== undefined) {
			formData.append('temperature', options.temperature.toString());
		}
		
		formData.append('response_format', options.responseFormat || 'verbose_json');

		if (onProgress) {
			onProgress('Transcription en cours...');
		}

		// Effectuer la requête
		const response = await fetch(this.OPENAI_API_URL, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
			},
			body: formData
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorMessage = `Erreur HTTP ${response.status}`;
			
			try {
				const errorData = JSON.parse(errorText);
				errorMessage = errorData.error?.message || errorMessage;
			} catch {
				errorMessage += `: ${errorText}`;
			}
			
			throw new Error(errorMessage);
		}

		const result = await response.json();
		
		if (onProgress) {
			onProgress('Transcription terminée !');
		}

		// Parser le résultat selon le format
		return this.parseTranscriptionResult(result, options.responseFormat || 'verbose_json');
	}

	private parseTranscriptionResult(result: any, format: string): TranscriptionResult {
		if (format === 'verbose_json') {
			return {
				text: result.text || '',
				language: result.language,
				duration: result.duration
			};
		} else if (format === 'json') {
			return {
				text: result.text || ''
			};
		} else {
			// Pour les formats texte brut (text, srt, vtt)
			return {
				text: typeof result === 'string' ? result : result.text || ''
			};
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Valide une clé API OpenAI
	 */
	async validateApiKey(apiKey: string): Promise<boolean> {
		if (!apiKey || apiKey.trim() === '') {
			return false;
		}

		try {
			// Tester avec un petit fichier audio factice
			const silentBlob = this.createSilentAudioBlob();
			
			const formData = new FormData();
			const audioFile = new File([silentBlob], 'test.webm', { type: 'audio/webm' });
			formData.append('file', audioFile);
			formData.append('model', 'whisper-1');

			const response = await fetch(this.OPENAI_API_URL, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
				},
				body: formData
			});

			return response.ok;
		} catch (error) {
			console.error('Erreur lors de la validation de la clé API:', error);
			return false;
		}
	}

	/**
	 * Crée un blob audio silencieux minimal pour les tests
	 */
	private createSilentAudioBlob(): Blob {
		// Un blob WebM minimal (quelques octets de silence)
		const silentData = new Uint8Array([
			0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x1f, 0x42, 0x86, 0x81, 0x01
		]);
		return new Blob([silentData], { type: 'audio/webm' });
	}

	/**
	 * Convertit un fichier audio en format compatible avec Whisper
	 */
	async convertAudioIfNeeded(audioBlob: Blob): Promise<Blob> {
		// Pour l'instant, on retourne le blob tel quel
		// Dans une version future, on pourrait convertir les formats non supportés
		return audioBlob;
	}

	/**
	 * Estime le coût de la transcription
	 */
	estimateTranscriptionCost(audioDurationMinutes: number): number {
		// OpenAI Whisper coûte $0.006 par minute
		return audioDurationMinutes * 0.006;
	}
}

