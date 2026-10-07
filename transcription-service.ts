import { requestUrl } from 'obsidian';
import { buildMultipartBody } from './audio-utils';
import { ProcessingLog } from './processing-logger';

export interface TranscriptionResult {
	text: string;
	language?: string;
	segmentCount?: number;
}

export interface TranscriptionOptions {
	baseUrl: string;
	language?: string; // undefined = auto-détection
}

/**
 * Client du serveur whisper.cpp local (whisper-server), endpoint POST /inference
 */
export class TranscriptionService {
	async checkServer(baseUrl: string, log: ProcessingLog): Promise<void> {
		const url = trimTrailingSlash(baseUrl);
		let status: number;
		try {
			const response = await requestUrl({ url, method: 'GET', throw: false });
			status = response.status;
		} catch (error) {
			throw new Error(`Serveur Whisper injoignable sur ${url}. Vérifiez que whisper-server est lancé.`);
		}
		log.info('Serveur Whisper joignable', { url, httpStatus: status });
	}

	async transcribe(wav: ArrayBuffer, options: TranscriptionOptions, log: ProcessingLog): Promise<TranscriptionResult> {
		const url = `${trimTrailingSlash(options.baseUrl)}/inference`;
		const { body, contentType } = buildMultipartBody([
			{ name: 'file', filename: 'recording.wav', contentType: 'audio/wav', data: wav },
			{ name: 'temperature', value: '0.0' },
			{ name: 'response_format', value: 'verbose_json' },
			...(options.language ? [{ name: 'language', value: options.language }] : [])
		]);

		log.info('Requête Whisper', {
			url,
			audioBytes: wav.byteLength,
			language: options.language ?? 'auto',
			responseFormat: 'verbose_json'
		});

		const response = await requestUrl({
			url,
			method: 'POST',
			headers: { 'Content-Type': contentType },
			body,
			throw: false
		});

		log.info('Réponse Whisper', { httpStatus: response.status, responseChars: response.text.length });

		if (response.status >= 400) {
			throw new Error(`Whisper a répondu HTTP ${response.status}: ${response.text.slice(0, 500)}`);
		}

		return parseResponse(response.text);
	}
}

function parseResponse(raw: string): TranscriptionResult {
	try {
		const data = JSON.parse(raw);
		return {
			text: String(data.text ?? '').trim(),
			language: data.language,
			segmentCount: Array.isArray(data.segments) ? data.segments.length : undefined
		};
	} catch {
		// Réponse en texte brut (si le serveur ignore response_format)
		return { text: raw.trim() };
	}
}

function trimTrailingSlash(url: string): string {
	return url.trim().replace(/\/+$/, '');
}
