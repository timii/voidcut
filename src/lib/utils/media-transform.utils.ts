import { PreviewAspectRatio } from '$lib/interfaces/Player';
import type {
	IImageTimelineElementSettings,
	TimelineElementScaleMode
} from '$lib/interfaces/Timeline';

export const MEDIA_CROP_ASPECT_RATIO_PRESETS = [
	PreviewAspectRatio.E21_9,
	PreviewAspectRatio.E16_9,
	PreviewAspectRatio.E9_16,
	PreviewAspectRatio.E4_3,
	PreviewAspectRatio.E1_1
] as const;

export type MediaObjectFit = 'contain' | 'fill' | 'cover';
export type MediaFrameSize = 'full' | 'width' | 'height';

export interface FullMediaTransformLayout {
	objectFit: Extract<MediaObjectFit, 'contain' | 'fill'>;
	frameSize: Extract<MediaFrameSize, 'full'>;
}

export interface CropMediaTransformLayout {
	objectFit: Extract<MediaObjectFit, 'cover'>;
	frameSize: Extract<MediaFrameSize, 'width' | 'height'>;
	frameAspectRatio: PreviewAspectRatio;
}

export type MediaTransformLayout = FullMediaTransformLayout | CropMediaTransformLayout;

type MediaScaleSettings = Pick<IImageTimelineElementSettings, 'scaleMode' | 'cropAspectRatio'>;

type MediaVisualSettings = Pick<
	IImageTimelineElementSettings,
	'scaleMode' | 'cropAspectRatio' | 'flipHorizontal' | 'flipVertical' | 'opacity'
>;

export function getDisplayedScaleMode(
	scaleMode: TimelineElementScaleMode,
	cropOptionsOpen: boolean
): TimelineElementScaleMode {
	return cropOptionsOpen ? 'crop' : scaleMode;
}

export function getMediaTransformLayout(
	settings: MediaScaleSettings,
	projectAspectRatio: PreviewAspectRatio
): MediaTransformLayout {
	if (settings.scaleMode === 'fit') {
		return { objectFit: 'contain', frameSize: 'full' };
	}

	if (settings.scaleMode === 'fill') {
		return { objectFit: 'fill', frameSize: 'full' };
	}

	const frameAspectRatio = getCropAspectRatio(settings);

	return {
		objectFit: 'cover',
		// constrain the crop frame by whichever project edge it reaches first
		frameSize:
			parseAspectRatio(frameAspectRatio) >= parseAspectRatio(projectAspectRatio)
				? 'width'
				: 'height',
		frameAspectRatio
	};
}

export function getMediaVisualFilters(
	settings: MediaVisualSettings,
	outputResolution: string
): string[] {
	const [width, height] = outputResolution.split('x');
	const filters: string[] = [];

	if (settings.scaleMode === 'crop') {
		// crop before scaling so preview and export use the same centered composition
		const ratio = getCropAspectRatio(settings);
		filters.push(
			`crop=w='if(gt(iw/ih,${ratio}),ih*${ratio},iw)':h='if(gt(iw/ih,${ratio}),ih,iw/(${ratio}))':x=(iw-ow)/2:y=(ih-oh)/2`
		);
	}

	filters.push(
		settings.scaleMode === 'fill'
			? `scale=${width}:${height}`
			: `scale=w=${width}:h=${height}:force_original_aspect_ratio=decrease:force_divisible_by=2`
	);

	if (settings.flipHorizontal) {
		filters.push('hflip');
	}

	if (settings.flipVertical) {
		filters.push('vflip');
	}

	if (settings.opacity < 1) {
		filters.push('format=rgba', `colorchannelmixer=aa=${settings.opacity}`);
	}

	return filters;
}

function getCropAspectRatio(settings: MediaScaleSettings): PreviewAspectRatio {
	if (settings.cropAspectRatio === undefined) {
		throw new Error('Crop media settings require an aspect ratio');
	}

	return settings.cropAspectRatio;
}

function parseAspectRatio(aspectRatio: PreviewAspectRatio): number {
	const [width, height] = aspectRatio.split('/').map(Number);
	return width / height;
}
