import { describe, expect, it } from 'vitest';
import { MediaType } from '$lib/interfaces/Media';
import { PreviewAspectRatio } from '$lib/interfaces/Player';
import type { ITimelineElement, TimelineElementSettings } from '$lib/interfaces/Timeline';
import {
	getDefaultTimelineElementSettings,
	normalizeTimelineElementSettings
} from '../timeline-settings.utils';

function makeElement(type: MediaType, settings: TimelineElementSettings): ITimelineElement {
	return {
		elementId: 'element-1',
		mediaId: 'media-1',
		mediaName: 'media',
		mediaImage: 'preview.png',
		type,
		duration: 3000,
		maxDuration: undefined,
		playbackStartTime: 0,
		trimFromStart: 0,
		trimFromEnd: 0,
		settings
	};
}

function asTimelineSettings(settings: unknown): TimelineElementSettings {
	return settings as TimelineElementSettings;
}

describe('timeline element scale settings', () => {
	it.each([MediaType.Image, MediaType.Video])(
		'defaults new %s elements to fit without a crop ratio',
		(type) => {
			expect(getDefaultTimelineElementSettings(type)).toMatchObject({ scaleMode: 'fit' });
			expect(getDefaultTimelineElementSettings(type)).not.toHaveProperty('cropAspectRatio');
		}
	);

	it.each([MediaType.Image, MediaType.Video])(
		'preserves valid crop settings for %s elements',
		(type) => {
			const defaults = getDefaultTimelineElementSettings(type);
			const element = makeElement(
				type,
				asTimelineSettings({
					...defaults,
					scaleMode: 'crop',
					cropAspectRatio: PreviewAspectRatio.E9_16
				})
			);

			expect(normalizeTimelineElementSettings(element)).toMatchObject({
				scaleMode: 'crop',
				cropAspectRatio: PreviewAspectRatio.E9_16
			});
		}
	);

	it.each(['fit', 'fill'] as const)('removes the crop ratio from %s settings', (scaleMode) => {
		const element = makeElement(
			MediaType.Image,
			asTimelineSettings({
				flipHorizontal: false,
				flipVertical: false,
				opacity: 1,
				scaleMode,
				cropAspectRatio: PreviewAspectRatio.E1_1
			})
		);

		const settings = normalizeTimelineElementSettings(element);

		expect(settings).toMatchObject({ scaleMode });
		expect(settings).not.toHaveProperty('cropAspectRatio');
	});

	it.each([
		['an unknown mode', { scaleMode: 'stretch' }],
		['crop without a ratio', { scaleMode: 'crop' }],
		['crop with an unsupported ratio', { scaleMode: 'crop', cropAspectRatio: '3/2' }],
		['legacy settings', {}]
	])('normalizes %s to fit', (_label, scaleSettings) => {
		const element = makeElement(
			MediaType.Video,
			asTimelineSettings({
				flipHorizontal: false,
				flipVertical: false,
				volume: 1,
				speed: 1,
				opacity: 1,
				...scaleSettings
			})
		);

		const settings = normalizeTimelineElementSettings(element);

		expect(settings).toMatchObject({ scaleMode: 'fit' });
		expect(settings).not.toHaveProperty('cropAspectRatio');
	});

	it('leaves audio settings unchanged', () => {
		const defaults = getDefaultTimelineElementSettings(MediaType.Audio);
		const element = makeElement(MediaType.Audio, defaults);

		expect(normalizeTimelineElementSettings(element)).toEqual(defaults);
		expect(defaults).not.toHaveProperty('scaleMode');
		expect(defaults).not.toHaveProperty('cropAspectRatio');
	});
});
