export type LogLevel = 'INFO' | 'STEP' | 'OK' | 'WARN' | 'ERROR';

/**
 * Journal texte d'un traitement d'enregistrement, pensé pour être copié-collé
 * dans un agent de code lors du débogage.
 */
export class ProcessingLog {
	private readonly startedAt = Date.now();
	private readonly lines: string[] = [];
	private readonly header: string[];
	private footer: string | null = null;

	constructor(title: string, context: Record<string, unknown>) {
		this.header = [
			`=== ${title} ===`,
			`Démarré le: ${new Date(this.startedAt).toISOString()}`,
			...Object.entries(context).map(([key, value]) => `${key}: ${formatValue(value)}`),
			'---'
		];
	}

	step(message: string, details?: Record<string, unknown>) {
		this.log('STEP', message, details);
	}

	info(message: string, details?: Record<string, unknown>) {
		this.log('INFO', message, details);
	}

	ok(message: string, details?: Record<string, unknown>) {
		this.log('OK', message, details);
	}

	warn(message: string, details?: Record<string, unknown>) {
		this.log('WARN', message, details);
	}

	error(message: string, error?: unknown) {
		this.log('ERROR', message);
		if (error instanceof Error) {
			this.lines.push(`    erreur: ${error.name}: ${error.message}`);
			if (error.stack) {
				this.lines.push(...error.stack.split('\n').slice(1, 6).map(line => `    ${line.trim()}`));
			}
		} else if (error !== undefined) {
			this.lines.push(`    erreur: ${formatValue(error)}`);
		}
	}

	/**
	 * Exécute une étape asynchrone en journalisant sa durée et son éventuel échec
	 */
	async time<T>(label: string, action: () => Promise<T>): Promise<T> {
		const start = Date.now();
		this.step(`${label}...`);
		try {
			const result = await action();
			this.ok(`${label} terminé en ${Date.now() - start} ms`);
			return result;
		} catch (error) {
			this.error(`${label} échoué après ${Date.now() - start} ms`, error);
			throw error;
		}
	}

	finish(status: 'completed' | 'error') {
		const totalSec = ((Date.now() - this.startedAt) / 1000).toFixed(2);
		this.footer = `--- Fin: ${status.toUpperCase()} en ${totalSec} s ---`;
	}

	toText(): string {
		const footer = this.footer ?? '--- Fin: EN COURS ---';
		return [...this.header, ...this.lines, footer, ''].join('\n');
	}

	private log(level: LogLevel, message: string, details?: Record<string, unknown>) {
		const elapsed = ((Date.now() - this.startedAt) / 1000).toFixed(3);
		this.lines.push(`[+${elapsed}s] [${level}] ${message}`);
		if (details && Object.keys(details).length > 0) {
			this.lines.push(`    ${formatValue(details)}`);
		}
		console.log(`[AI Recording] [${level}] ${message}`, details ?? '');
	}
}

function formatValue(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}
