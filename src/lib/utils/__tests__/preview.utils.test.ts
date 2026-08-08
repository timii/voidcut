import { describe, expect, it } from 'vitest';
import { MediaType, type IMedia } from '$lib/interfaces/Media';
import type { ITimelineElement, ITimelineTrack } from '$lib/interfaces/Timeline';
import { getManagedPreviewElements, getManagedPreviewSignature } from '../preview.utils';

const settings = {
	flipHorizontal: false,
	flipVertical: false,
	opacity: 1
};

function makeElement(
	elementId: string,
	playbackStartTime: number,
	duration = 1000,
	mediaId = `media-${elementId}`
): ITimelineElement {
	return {
		elementId,
		mediaId,
		mediaName: `${elementId}.png`,
		mediaImage: `${elementId}.png`,
		type: MediaType.Image,
		duration,
		maxDuration: undefined,
		playbackStartTime,
		trimFromStart: 0,
		trimFromEnd: 0,
		settings
	};
}

function makeMedia(element: ITimelineElement): IMedia {
	return {
		name: element.mediaName,
		mediaId: element.mediaId,
		type: element.type,
		src: `blob:${element.mediaId}`,
		loaded: true,
		previewImage: element.mediaImage
	};
}

function resolve(tracks: ITimelineTrack[], timeMs: number, preloadWindowMs = 3000) {
	const media = tracks.flatMap((track) => track.elements.map(makeMedia));
	return getManagedPreviewElements(tracks, media, timeMs, preloadWindowMs);
}

describe('getManagedPreviewElements', () => {
	it('includes an element at its start and excludes it at its end', () => {
		const element = makeElement('clip', 1000, 1000);
		const tracks = [{ trackId: 'track', elements: [element] }];

		expect(resolve(tracks, 1000).map(({ elementId, active }) => ({ elementId, active }))).toEqual([
			{ elementId: 'clip', active: true }
		]);
		expect(resolve(tracks, 2000)).toEqual([]);
	});

	it('keeps only the nearest upcoming element on each track', () => {
		const tracks = [
			{
				trackId: 'track',
				elements: [makeElement('nearest', 2000), makeElement('later', 2500)]
			}
		];

		expect(resolve(tracks, 0).map(({ elementId, active }) => ({ elementId, active }))).toEqual([
			{ elementId: 'nearest', active: false }
		]);
	});

	it('does not preload an element outside the preload window', () => {
		const tracks = [{ trackId: 'track', elements: [makeElement('later', 3001)] }];

		expect(resolve(tracks, 0)).toEqual([]);
	});

	it('retains overlapping active elements and stable track layer order', () => {
		const tracks = [
			{
				trackId: 'top',
				elements: [makeElement('top-a', 0, 2000), makeElement('top-b', 500, 2000)]
			},
			{ trackId: 'bottom', elements: [makeElement('bottom', 0, 2000)] }
		];

		expect(
			resolve(tracks, 1000).map(({ elementId, active, layerIndex }) => ({
				elementId,
				active,
				layerIndex
			}))
		).toEqual([
			{ elementId: 'top-a', active: true, layerIndex: 2 },
			{ elementId: 'top-b', active: true, layerIndex: 2 },
			{ elementId: 'bottom', active: true, layerIndex: 1 }
		]);
	});

	it('omits timeline elements whose source media is missing', () => {
		const found = makeElement('found', 0);
		const missing = makeElement('missing', 0);
		const tracks = [{ trackId: 'track', elements: [found, missing] }];

		expect(
			getManagedPreviewElements(tracks, [makeMedia(found)], 0).map(({ elementId }) => elementId)
		).toEqual(['found']);
	});

	it('bounds a 200 clip track to the active and nearest upcoming elements', () => {
		const elements = Array.from({ length: 200 }, (_, index) =>
			makeElement(`clip-${index}`, index * 1000)
		);
		const tracks = [{ trackId: 'track', elements }];

		expect(resolve(tracks, 50_500).map(({ elementId }) => elementId)).toEqual([
			'clip-50',
			'clip-51'
		]);
	});
});

describe('getManagedPreviewSignature', () => {
	it('stays stable until managed membership or activity changes', () => {
		const tracks = [
			{
				trackId: 'track',
				elements: [makeElement('first', 0), makeElement('second', 1000), makeElement('third', 2000)]
			}
		];

		expect(getManagedPreviewSignature(resolve(tracks, 100))).toBe(
			getManagedPreviewSignature(resolve(tracks, 200))
		);
		expect(getManagedPreviewSignature(resolve(tracks, 100))).not.toBe(
			getManagedPreviewSignature(resolve(tracks, 1000))
		);
	});
});
