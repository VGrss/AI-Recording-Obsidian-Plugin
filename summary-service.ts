import { Notice } from 'obsidian';

export interface SummaryResult {
	text: string;
	tokensUsed?: number;
}

export interface SummaryOptions {
	apiKey: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
	summaryLength?: 'short' | 'medium' | 'long';
}

export interface TemplateVariables {
	transcript: string;
	language?: string;
	datetime: string;
	duration: string;
	title: string;
	date: string;
}

export class SummaryService {
	private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
	private readonly MAX_RETRIES = 3;
	private readonly RETRY_DELAY = 2000; // 2 secondes

	/**
	 * Génère un résumé à partir d'une transcription
	 */
	async generateSummary(
		template: string,
		variables: TemplateVariables,
		options: SummaryOptions,
		onProgress?: (status: string) => void
	): Promise<SummaryResult> {
		let lastError: Error | null = null;
		
		for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
			try {
				if (onProgress) {
					onProgress(`Tentative ${attempt}/${this.MAX_RETRIES}...`);
				}
				
				const result = await this.callOpenAI(template, variables, options, onProgress);
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
		
		throw new Error(`Échec de la génération du résumé après ${this.MAX_RETRIES} tentatives: ${lastError?.message}`);
	}

	private async callOpenAI(
		template: string,
		variables: TemplateVariables,
		options: SummaryOptions,
		onProgress?: (status: string) => void
	): Promise<SummaryResult> {
		// Vérifier la clé API
		if (!options.apiKey || options.apiKey.trim() === '') {
			throw new Error('Clé API OpenAI manquante. Veuillez la configurer dans les paramètres.');
		}

		if (onProgress) {
			onProgress('Préparation du prompt...');
		}

		// Remplacer les variables dans le template
		const prompt = this.replaceVariables(template, variables);

		// Calculer maxTokens selon la longueur du résumé
		const maxTokens = this.getMaxTokensForLength(options.summaryLength || 'medium');

		if (onProgress) {
			onProgress('Génération du résumé en cours...');
		}

		// Effectuer la requête à OpenAI
		const response = await fetch(this.OPENAI_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${options.apiKey}`,
			},
			body: JSON.stringify({
				model: options.model || 'gpt-4o',
				messages: [
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: options.temperature || 0.7,
				max_tokens: options.maxTokens || maxTokens
			})
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
			onProgress('Résumé généré avec succès !');
		}

		return {
			text: result.choices[0]?.message?.content || '',
			tokensUsed: result.usage?.total_tokens
		};
	}

	/**
	 * Remplace les variables dans le template
	 */
	replaceVariables(template: string, variables: TemplateVariables): string {
		let result = template;
		
		// Remplacer chaque variable
		result = result.replace(/\{\{transcript\}\}/g, variables.transcript || '');
		result = result.replace(/\{\{language\}\}/g, variables.language || 'non détectée');
		result = result.replace(/\{\{datetime\}\}/g, variables.datetime || '');
		result = result.replace(/\{\{duration\}\}/g, variables.duration || '');
		result = result.replace(/\{\{title\}\}/g, variables.title || '');
		result = result.replace(/\{\{date\}\}/g, variables.date || '');
		
		return result;
	}

	/**
	 * Retourne le nombre max de tokens selon la longueur demandée
	 */
	private getMaxTokensForLength(length: 'short' | 'medium' | 'long'): number {
		switch (length) {
			case 'short':
				return 500;  // 1-2 paragraphes
			case 'medium':
				return 1000; // 3-5 paragraphes
			case 'long':
				return 2000; // Détaillé
			default:
				return 1000;
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
			const response = await fetch(this.OPENAI_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model: 'gpt-4o',
					messages: [{ role: 'user', content: 'Test' }],
					max_tokens: 5
				})
			});

			return response.ok;
		} catch (error) {
			console.error('Erreur lors de la validation de la clé API:', error);
			return false;
		}
	}

	/**
	 * Estime le coût du résumé
	 */
	estimateSummaryCost(tokensUsed: number, model: string): number {
		// Coûts approximatifs OpenAI (par 1M tokens)
		const costs: Record<string, { input: number; output: number }> = {
			'gpt-4o': { input: 5, output: 15 },           // $5/$15 per 1M tokens
			'gpt-4o-mini': { input: 0.15, output: 0.6 },  // $0.15/$0.60 per 1M tokens
			'gpt-4-turbo': { input: 10, output: 30 },     // $10/$30 per 1M tokens
			'gpt-3.5-turbo': { input: 0.5, output: 1.5 }  // $0.50/$1.50 per 1M tokens
		};

		const cost = costs[model] || costs['gpt-4o'];
		// Estimation moyenne (50% input, 50% output)
		const avgCostPer1M = (cost.input + cost.output) / 2;
		return (tokensUsed / 1000000) * avgCostPer1M;
	}

	/**
	 * Extrait le texte de transcription depuis un fichier de transcription
	 */
	async extractTranscriptText(transcriptContent: string): Promise<string> {
		// Extraire seulement le texte de la transcription (sans les métadonnées)
		const lines = transcriptContent.split('\n');
		const separatorIndex = lines.findIndex(line => line.trim() === '---');
		
		if (separatorIndex !== -1 && separatorIndex < lines.length - 1) {
			return lines.slice(separatorIndex + 1).join('\n').trim();
		}
		
		return transcriptContent;
	}
}

