/** Fréquence attendue par whisper.cpp : 16 kHz, mono, PCM 16 bits */
export const WHISPER_SAMPLE_RATE = 16000;

export interface DecodedAudio {
	samples: Float32Array;
	durationSec: number;
	sourceSampleRate: number;
	sourceChannels: number;
}

/**
 * Décode un fichier WebM/Opus et le rééchantillonne en mono 16 kHz
 */
export async function decodeToMono16k(data: ArrayBuffer): Promise<DecodedAudio> {
	const audioContext = new AudioContext();
	let decoded: AudioBuffer;
	try {
		decoded = await audioContext.decodeAudioData(data);
	} finally {
		await audioContext.close();
	}

	const frameCount = Math.ceil(decoded.duration * WHISPER_SAMPLE_RATE);
	const offline = new OfflineAudioContext(1, frameCount, WHISPER_SAMPLE_RATE);
	const source = offline.createBufferSource();
	source.buffer = decoded;
	source.connect(offline.destination);
	source.start(0);
	const rendered = await offline.startRendering();

	return {
		samples: rendered.getChannelData(0),
		durationSec: decoded.duration,
		sourceSampleRate: decoded.sampleRate,
		sourceChannels: decoded.numberOfChannels
	};
}

/**
 * Encode des échantillons Float32 en WAV PCM 16 bits
 */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
	const bytesPerSample = 2;
	const dataSize = samples.length * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);

	writeAscii(view, 0, 'RIFF');
	view.setUint32(4, 36 + dataSize, true);
	writeAscii(view, 8, 'WAVE');
	writeAscii(view, 12, 'fmt ');
	view.setUint32(16, 16, true); // taille du bloc fmt
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, 1, true); // mono
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * bytesPerSample, true);
	view.setUint16(32, bytesPerSample, true);
	view.setUint16(34, 16, true); // bits par échantillon
	writeAscii(view, 36, 'data');
	view.setUint32(40, dataSize, true);

	let offset = 44;
	for (let i = 0; i < samples.length; i++) {
		const sample = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
		offset += bytesPerSample;
	}

	return buffer;
}

function writeAscii(view: DataView, offset: number, text: string) {
	for (let i = 0; i < text.length; i++) {
		view.setUint8(offset + i, text.charCodeAt(i));
	}
}

export type MultipartField =
	| { name: string; value: string }
	| { name: string; filename: string; contentType: string; data: ArrayBuffer };

/**
 * Construit un corps multipart/form-data (Obsidian requestUrl n'accepte pas FormData)
 */
export function buildMultipartBody(fields: MultipartField[]): { body: ArrayBuffer; contentType: string } {
	const boundary = `----AIRecordingBoundary${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
	const encoder = new TextEncoder();
	const parts: Uint8Array[] = [];

	for (const field of fields) {
		if ('data' in field) {
			parts.push(encoder.encode(
				`--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"; filename="${field.filename}"\r\nContent-Type: ${field.contentType}\r\n\r\n`
			));
			parts.push(new Uint8Array(field.data));
		} else {
			parts.push(encoder.encode(
				`--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"\r\n\r\n${field.value}`
			));
		}
		parts.push(encoder.encode('\r\n'));
	}
	parts.push(encoder.encode(`--${boundary}--\r\n`));

	const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0);
	const body = new Uint8Array(totalLength);
	let offset = 0;
	for (const part of parts) {
		body.set(part, offset);
		offset += part.byteLength;
	}

	return { body: body.buffer, contentType: `multipart/form-data; boundary=${boundary}` };
}
