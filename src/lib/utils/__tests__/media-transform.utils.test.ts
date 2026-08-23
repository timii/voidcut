import { describe, expect, it } from 'vitest';
import { PreviewAspectRatio } from '$lib/interfaces/Player';
import type { IImageTimelineElementSettings } from '$lib/interfaces/Timeline';
import {
	getDisplayedScaleMode,
	getMediaTransformLayout,
	getMediaVisualFilters,
	MEDIA_CROP_ASPECT_RATIO_PRESETS
} from '../media-transform.utils';

function makeSettings(
	overrides: Partial<IImageTimelineElementSettings> = {}
): IImageTimelineElementSettings {
	return {
		flipHorizontal: false,
		flipVertical: false,
		opacity: 1,
		scaleMode: 'fit',
		...overrides
	};
}

describe('media transform layout', () => {
	it('shows crop as active while its options are open', () => {
		expect(getDisplayedScaleMode('fill', true)).toBe('crop');
		expect(getDisplayedScaleMode('fit', true)).toBe('crop');
	});

	it('shows the applied scale mode while crop options are closed', () => {
		expect(getDisplayedScaleMode('fill', false)).toBe('fill');
		expect(getDisplayedScaleMode('fit', false)).toBe('fit');
	});

	it('lists crop aspect ratio presets in UI order', () => {
		expect(MEDIA_CROP_ASPECT_RATIO_PRESETS).toEqual([
			PreviewAspectRatio.E21_9,
			PreviewAspectRatio.E16_9,
			PreviewAspectRatio.E9_16,
			PreviewAspectRatio.E4_3,
			PreviewAspectRatio.E1_1
		]);
	});

	it('uses the full project frame for fit', () => {
		expect(
			getMediaTransformLayout(makeSettings({ scaleMode: 'fit' }), PreviewAspectRatio.E16_9)
		).toEqual({ objectFit: 'contain', frameSize: 'full' });
	});

	it('uses the full project frame for fill', () => {
		expect(
			getMediaTransformLayout(makeSettings({ scaleMode: 'fill' }), PreviewAspectRatio.E16_9)
		).toEqual({ objectFit: 'fill', frameSize: 'full' });
	});

	it('sizes a wider landscape crop from the project width', () => {
		expect(
			getMediaTransformLayout(
				makeSettings({
					scaleMode: 'crop',
					cropAspectRatio: PreviewAspectRatio.E21_9
				}),
				PreviewAspectRatio.E16_9
			)
		).toEqual({
			objectFit: 'cover',
			frameSize: 'width',
			frameAspectRatio: PreviewAspectRatio.E21_9
		});
	});

	it('sizes a portrait crop from the project height', () => {
		expect(
			getMediaTransformLayout(
				makeSettings({
					scaleMode: 'crop',
					cropAspectRatio: PreviewAspectRatio.E9_16
				}),
				PreviewAspectRatio.E16_9
			)
		).toEqual({
			objectFit: 'cover',
			frameSize: 'height',
			frameAspectRatio: PreviewAspectRatio.E9_16
		});
	});
});

describe('media visual filters', () => {
	it('scales fit media within the target while preserving its aspect ratio', () => {
		expect(getMediaVisualFilters(makeSettings({ scaleMode: 'fit' }), '1920x1080')).toEqual([
			'scale=w=1920:h=1080:force_original_aspect_ratio=decrease:force_divisible_by=2'
		]);
	});

	it('scales fill media to the exact target dimensions', () => {
		expect(getMediaVisualFilters(makeSettings({ scaleMode: 'fill' }), '1920x1080')).toEqual([
			'scale=1920:1080'
		]);
	});

	it('centers a crop to the selected ratio before fitting it within the target', () => {
		expect(
			getMediaVisualFilters(
				makeSettings({
					scaleMode: 'crop',
					cropAspectRatio: PreviewAspectRatio.E4_3
				}),
				'1920x1080'
			)
		).toEqual([
			"crop=w='if(gt(iw/ih,4/3),ih*4/3,iw)':h='if(gt(iw/ih,4/3),ih,iw/(4/3))':x=(iw-ow)/2:y=(ih-oh)/2",
			'scale=w=1920:h=1080:force_original_aspect_ratio=decrease:force_divisible_by=2'
		]);
	});

	it('composes scale, both flips, and opacity in order', () => {
		expect(
			getMediaVisualFilters(
				makeSettings({ flipHorizontal: true, flipVertical: true, opacity: 0.4 }),
				'1080x1920'
			)
		).toEqual([
			'scale=w=1080:h=1920:force_original_aspect_ratio=decrease:force_divisible_by=2',
			'hflip',
			'vflip',
			'format=rgba',
			'colorchannelmixer=aa=0.4'
		]);
	});
});
