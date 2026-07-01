import { ExportFormat, ExportResolution, type IExportSettings } from '$lib/interfaces/Ffmpeg';
import { PreviewAspectRatio } from '$lib/interfaces/Player';

export const defaultExportSettings: IExportSettings = {
	format: ExportFormat.MP4,
	resolution: ExportResolution.AUTO,
	compression: 50,
	fileName: 'output'
};

const formatMimeTypes: Record<ExportFormat, string> = {
	[ExportFormat.MP4]: 'video/mp4',
	[ExportFormat.GIF]: 'image/gif',
	[ExportFormat.PNG]: 'image/png',
	[ExportFormat.MP3]: 'audio/mpeg'
};

const resolutionHeights: Record<Exclude<ExportResolution, ExportResolution.AUTO>, number> = {
	[ExportResolution.P480]: 480,
	[ExportResolution.P720]: 720,
	[ExportResolution.P1080]: 1080
};

const aspectRatioValues: Record<PreviewAspectRatio, number> = {
	[PreviewAspectRatio.E21_9]: 21 / 9,
	[PreviewAspectRatio.E16_9]: 16 / 9,
	[PreviewAspectRatio.E9_16]: 9 / 16,
	[PreviewAspectRatio.E4_3]: 4 / 3,
	[PreviewAspectRatio.E1_1]: 1
};

export function getExportMimeType(format: ExportFormat): string {
	return formatMimeTypes[format];
}

export function sanitizeExportBaseName(fileName: string): string {
	const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');
	const normalizedName = nameWithoutExtension
		.trim()
		.replace(/[\\/:*?"<>|]/g, '-')
		.replace(/\s+/g, ' ');

	return normalizedName || defaultExportSettings.fileName;
}

export function getExportFileName(settings: IExportSettings): string {
	return `${sanitizeExportBaseName(settings.fileName)}.${settings.format}`;
}

export function getExportResolution(
	resolution: ExportResolution,
	aspectRatio: PreviewAspectRatio
): string {
	// treat 480p as the common SD preset instead of deriving it from preview aspect ratio
	if (resolution === ExportResolution.P480) {
		return '640x480';
	}

	const targetHeight =
		resolution === ExportResolution.AUTO
			? resolutionHeights[ExportResolution.P1080]
			: resolutionHeights[resolution];
	const ratio = aspectRatioValues[aspectRatio];
	// keep dimensions even because many ffmpeg encoders reject odd pixel sizes
	const width = Math.max(2, Math.round((targetHeight * ratio) / 2) * 2);
	const height = Math.max(2, Math.round(targetHeight / 2) * 2);

	return `${width}x${height}`;
}

export function getCompressionCrf(compression: number): string {
	const value = clampCompression(compression);
	return `${Math.round(35 - (value / 100) * 17)}`;
}

export function getMp3Bitrate(compression: number): string {
	const value = clampCompression(compression);
	const bitrate = Math.round(128 + (value / 100) * 192);
	return `${bitrate}k`;
}

export function getGifFps(compression: number): string {
	const value = clampCompression(compression);
	return `${Math.round(10 + (value / 100) * 8)}`;
}

export function estimateExportFileSize(
	settings: IExportSettings,
	durationMs: number,
	aspectRatio: PreviewAspectRatio
): string {
	const durationInSeconds = Math.max(1, durationMs / 1000);
	const [width, height] = getExportResolution(settings.resolution, aspectRatio)
		.split('x')
		.map(Number);
	const megapixels = (width * height) / 1_000_000;
	// this is only a UI hint; real output size still depends on source media and ffmpeg internals
	const qualityMultiplier = 0.75 + clampCompression(settings.compression) / 200;

	const baseMegabytes =
		getEstimatedMegabytesPerSecond(settings.format, megapixels) *
		durationInSeconds *
		qualityMultiplier;

	const lower = formatMegabytes(baseMegabytes * 0.7);
	const upper = formatMegabytes(baseMegabytes * 1.5);

	return `${lower}-${upper} MB`;
}

function getEstimatedMegabytesPerSecond(format: ExportFormat, megapixels: number): number {
	switch (format) {
		case ExportFormat.GIF:
			return 0.75 * megapixels;
		case ExportFormat.PNG:
			return 1.15 * megapixels;
		case ExportFormat.MP3:
			return 0.02;
		case ExportFormat.MP4:
		default:
			return 0.18 * megapixels;
	}
}

function clampCompression(compression: number): number {
	return Math.max(0, Math.min(100, compression));
}

function formatMegabytes(value: number): string {
	if (value < 1) {
		return `${Math.max(0.1, value).toFixed(1)}`;
	}

	return `${+value.toFixed(1)}`;
}
