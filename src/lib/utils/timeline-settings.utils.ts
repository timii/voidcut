import { MediaType } from '$lib/interfaces/Media';
import type {
	IAudioTimelineElementSettings,
	IImageTimelineElementSettings,
	ITimelineElement,
	ITimelineTrack,
	IVideoTimelineElementSettings,
	TimelineElementSettings,
	TimelineElementSpeed
} from '$lib/interfaces/Timeline';
import { CONSTS } from './consts';

export const TIMELINE_SPEED_PRESETS: TimelineElementSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const DEFAULT_IMAGE_DURATION_MS = 3000;
export const IMAGE_DURATION_PRESETS_MS = [1000, 3000, 5000, 10000];
export const MAX_VOLUME = 2;
export const MIN_SETTING_VALUE = 0;
export const MAX_OPACITY = 1;

export function getDefaultTimelineElementSettings(type: MediaType): TimelineElementSettings {
	switch (type) {
		case MediaType.Audio:
			return {
				volume: 1,
				fadeInMs: 0,
				fadeOutMs: 0,
				speed: 1
			};
		case MediaType.Video:
			return {
				flipHorizontal: false,
				flipVertical: false,
				volume: 1,
				speed: 1,
				opacity: 1
			};
		case MediaType.Image:
		default:
			return {
				flipHorizontal: false,
				flipVertical: false,
				opacity: 1
			};
	}
}

export function normalizeTimelineElementSettings(
	element: ITimelineElement
): TimelineElementSettings {
	const existingSettings = element.settings as Partial<TimelineElementSettings> | undefined;
	const defaults = getDefaultTimelineElementSettings(element.type);

	if (element.type === MediaType.Audio) {
		const settings = existingSettings as Partial<IAudioTimelineElementSettings> | undefined;
		return {
			...defaults,
			volume: clampNumber(settings?.volume, MIN_SETTING_VALUE, MAX_VOLUME, 1),
			fadeInMs: clampFade(settings?.fadeInMs, element.duration),
			fadeOutMs: clampFade(settings?.fadeOutMs, element.duration),
			speed: normalizeSpeed(settings?.speed)
		} as IAudioTimelineElementSettings;
	}

	if (element.type === MediaType.Video) {
		const settings = existingSettings as Partial<IVideoTimelineElementSettings> | undefined;
		return {
			...defaults,
			flipHorizontal: settings?.flipHorizontal ?? false,
			flipVertical: settings?.flipVertical ?? false,
			volume: clampNumber(settings?.volume, MIN_SETTING_VALUE, MAX_VOLUME, 1),
			speed: normalizeSpeed(settings?.speed),
			opacity: clampNumber(settings?.opacity, MIN_SETTING_VALUE, MAX_OPACITY, 1)
		} as IVideoTimelineElementSettings;
	}

	const settings = existingSettings as Partial<IImageTimelineElementSettings> | undefined;
	return {
		...defaults,
		flipHorizontal: settings?.flipHorizontal ?? false,
		flipVertical: settings?.flipVertical ?? false,
		opacity: clampNumber(settings?.opacity, MIN_SETTING_VALUE, MAX_OPACITY, 1)
	} as IImageTimelineElementSettings;
}

export function normalizeTimelineElement(element: ITimelineElement): ITimelineElement {
	return {
		...element,
		settings: normalizeTimelineElementSettings(element)
	};
}

export function normalizeTimelineTracks(tracks: ITimelineTrack[]): ITimelineTrack[] {
	return tracks.map((track) => ({
		...track,
		elements: track.elements.map(normalizeTimelineElement)
	}));
}

export function getTimelineElementSpeed(element: ITimelineElement): TimelineElementSpeed {
	if (element.type === MediaType.Image) {
		return 1;
	}

	const settings = normalizeTimelineElementSettings(element) as
		| IAudioTimelineElementSettings
		| IVideoTimelineElementSettings;
	return settings.speed;
}

export function getSourceSegmentDuration(element: ITimelineElement): number {
	if (element.type === MediaType.Image) {
		return element.duration;
	}

	if (element.maxDuration !== undefined) {
		return Math.max(0, element.maxDuration - element.trimFromStart - element.trimFromEnd);
	}

	return element.duration * getTimelineElementSpeed(element);
}

export function getTimelineDurationForSpeed(
	element: ITimelineElement,
	speed: TimelineElementSpeed
): number {
	return Math.max(
		CONSTS.timelineElementMinWidthMs,
		Math.round(getSourceSegmentDuration(element) / speed)
	);
}

export function elementCanUseDuration(
	tracks: ITimelineTrack[],
	rowIndex: number,
	elementIndex: number,
	duration: number
): boolean {
	const element = tracks[rowIndex]?.elements[elementIndex];
	const nextElement = tracks[rowIndex]?.elements[elementIndex + 1];

	if (!element) {
		return false;
	}

	if (duration < CONSTS.timelineElementMinWidthMs) {
		return false;
	}

	if (!nextElement) {
		return true;
	}

	return element.playbackStartTime + duration <= nextElement.playbackStartTime;
}

export function clampFade(value: number | undefined, duration: number): number {
	return clampNumber(value, MIN_SETTING_VALUE, duration, 0);
}

export function clampNumber(
	value: number | undefined,
	min: number,
	max: number,
	fallback: number
): number {
	if (value === undefined || Number.isNaN(value)) {
		return fallback;
	}

	return Math.max(min, Math.min(max, value));
}

function normalizeSpeed(value: number | undefined): TimelineElementSpeed {
	return TIMELINE_SPEED_PRESETS.includes(value as TimelineElementSpeed)
		? (value as TimelineElementSpeed)
		: 1;
}
