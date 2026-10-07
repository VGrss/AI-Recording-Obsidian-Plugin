import { requestUrl } from 'obsidian';
import { ProcessingLog } from './processing-logger';

/** Fenêtre de contexte demandée à Ollama (le défaut de 2048 tronquerait les longues transcriptions) */
export const NUM_CTX = 16384;

export interface TemplateVariables {
	transcript: string;
	language?: string;
	datetime: string;
	duration: string;
	title: string;
	date: string;
}

export interface LlmOptions {
	baseUrl: string;
	model: string;
}

export interface LlmResult {
	text: string;
	promptTokens?: number;
	outputTokens?: number;
	totalMs?: number;
	doneReason?: string;
}

/**
 * Client d'Ollama local (API /api/chat) pour exécuter Llama
 */
export class SummaryService {
	async checkServer(baseUrl: string, model: string, log: ProcessingLog): Promise<void> {
		const url = `${trimTrailingSlash(baseUrl)}/api/tags`;
		let response;
		try {
			response = await requestUrl({ url, method: 'GET', throw: false });
		} catch (error) {
			throw new Error(`Ollama injoignable sur ${trimTrailingSlash(baseUrl)}. Vérifiez que Ollama est lancé.`);
		}

		if (response.status !== 200) {
			throw new Error(`Ollama a répondu HTTP ${response.status} sur ${url}`);
		}

		const installed: string[] = (response.json?.models ?? []).map((m: { name: string }) => m.name);
		log.info('Modèles Ollama installés', { models: installed, requested: model });

		const available = installed.some(name => name === model || name === `${model}:latest`);
		if (!available) {
			throw new Error(`Le modèle "${model}" n'est pas installé dans Ollama. Lancez: ollama pull ${model}`);
		}
	}

	async generateSummary(
		template: string,
		variables: TemplateVariables,
		options: LlmOptions & { summaryLength: 'short' | 'medium' | 'long' },
		log: ProcessingLog
	): Promise<LlmResult> {
		const prompt = this.replaceVariables(template, variables);
		const numPredict = getMaxTokensForLength(options.summaryLength);

		log.info('Prompt de résumé préparé', {
			promptChars: prompt.length,
			transcriptChars: variables.transcript.length,
			summaryLength: options.summaryLength
		});

		const result = await this.chat(
			[{ role: 'user', content: prompt }],
			{ ...options, temperature: 0.3, numPredict },
			log
		);

		if (result.doneReason === 'length') {
			log.warn('Résumé tronqué: limite de tokens atteinte', { numPredict });
		}
		return result;
	}

	async generateShortTitle(transcriptText: string, options: LlmOptions, log: ProcessingLog): Promise<string> {
		const textSample = transcriptText.substring(0, 1500);
		const result = await this.chat(
			[
				{
					role: 'system',
					content: 'Tu es un assistant qui génère des titres courts et pertinents. Réponds UNIQUEMENT avec 3 mots maximum, sans ponctuation, sans guillemets, juste les 3 mots.'
				},
				{
					role: 'user',
					content: `Génère un titre de 3 mots maximum qui résume cette transcription:\n\n${textSample}`
				}
			],
			{ ...options, temperature: 0.7, numPredict: 20 },
			log
		);

		const words = result.text
			.replace(/["'«».,:;!?]/g, '')
			.trim()
			.split(/\s+/)
			.filter(word => word.length > 0)
			.slice(0, 3);

		if (words.length === 0) {
			log.warn('Titre vide renvoyé par le modèle, titre par défaut utilisé');
			return 'Enregistrement Audio';
		}
		return words.join(' ');
	}

	/**
	 * Remplace les variables dans le template
	 */
	replaceVariables(template: string, variables: TemplateVariables): string {
		return template
			.replace(/\{\{transcript\}\}/g, variables.transcript || '')
			.replace(/\{\{language\}\}/g, variables.language || 'non détectée')
			.replace(/\{\{datetime\}\}/g, variables.datetime || '')
			.replace(/\{\{duration\}\}/g, variables.duration || '')
			.replace(/\{\{title\}\}/g, variables.title || '')
			.replace(/\{\{date\}\}/g, variables.date || '');
	}

	private async chat(
		messages: Array<{ role: string; content: string }>,
		options: LlmOptions & { temperature: number; numPredict: number },
		log: ProcessingLog
	): Promise<LlmResult> {
		const url = `${trimTrailingSlash(options.baseUrl)}/api/chat`;
		const body = JSON.stringify({
			model: options.model,
			messages,
			stream: false,
			options: {
				temperature: options.temperature,
				num_predict: options.numPredict,
				num_ctx: NUM_CTX
			}
		});

		log.info('Requête Ollama', { url, model: options.model, numCtx: NUM_CTX, numPredict: options.numPredict });

		const response = await requestUrl({
			url,
			method: 'POST',
			contentType: 'application/json',
			body,
			throw: false
		});

		if (response.status >= 400) {
			throw new Error(`Ollama a répondu HTTP ${response.status}: ${response.text.slice(0, 500)}`);
		}

		const data = response.json;
		const result: LlmResult = {
			text: String(data?.message?.content ?? '').trim(),
			promptTokens: data?.prompt_eval_count,
			outputTokens: data?.eval_count,
			totalMs: typeof data?.total_duration === 'number' ? Math.round(data.total_duration / 1e6) : undefined,
			doneReason: data?.done_reason
		};

		log.info('Réponse Ollama', {
			httpStatus: 200,
			model: data?.model,
			promptTokens: result.promptTokens,
			outputTokens: result.outputTokens,
			totalMs: result.totalMs,
			doneReason: result.doneReason,
			outputChars: result.text.length
		});

		if (result.promptTokens !== undefined && result.promptTokens >= NUM_CTX - 64) {
			log.warn('Entrée probablement tronquée: la transcription dépasse la fenêtre de contexte', { numCtx: NUM_CTX });
		}

		if (!result.text) {
			throw new Error('Ollama a renvoyé une réponse vide');
		}

		return result;
	}
}

function getMaxTokensForLength(length: 'short' | 'medium' | 'long'): number {
	switch (length) {
		case 'short':
			return 500;  // 1-2 paragraphes
		case 'long':
			return 2000; // Détaillé
		default:
			return 1000; // 3-5 paragraphes
	}
}

function trimTrailingSlash(url: string): string {
	return url.trim().replace(/\/+$/, '');
}
