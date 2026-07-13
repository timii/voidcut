import { describe, expect, it } from 'vitest';
import type { ITimelineElement, ITimelineTrack } from '$lib/interfaces/Timeline';
import { MediaType } from '$lib/interfaces/Media';
import { moveElementToAdjacentRow } from '../timeline.utils';

const settings = {
	flipHorizontal: false,
	flipVertical: false,
	opacity: 1
};

function makeElement(elementId: string, playbackStartTime: number): ITimelineElement {
	return {
		elementId,
		mediaId: `media-${elementId}`,
		mediaName: `${elementId}.png`,
		mediaImage: `${elementId}.png`,
		type: MediaType.Image,
		duration: 1000,
		maxDuration: undefined,
		playbackStartTime,
		trimFromStart: 100,
		trimFromEnd: 50,
		settings
	};
}

function makeTracks(): ITimelineTrack[] {
	return [
		{ trackId: 'before', elements: [makeElement('before', 0)] },
		{
			trackId: 'source',
			elements: [makeElement('first', 1000), makeElement('moved', 2000), makeElement('last', 3000)]
		},
		{ trackId: 'after', elements: [makeElement('after', 4000)] }
	];
}

describe('moveElementToAdjacentRow', () => {
	it('creates a new row above a populated source row', () => {
		const tracks = makeTracks();
		const original = structuredClone(tracks);
		const moved = tracks[1].elements[1];

		const result = moveElementToAdjacentRow(tracks, { rowIndex: 1, elementIndex: 1 }, 'up', 'new');

		expect(result).not.toBe(tracks);
		expect(result.map((track) => track.trackId)).toEqual(['before', 'new', 'source', 'after']);
		expect(result[1].elements).toEqual([moved]);
		expect(result[1].elements[0]).toBe(moved);
		expect(result[1].elements[0].playbackStartTime).toBe(2000);
		expect(result[2]).not.toBe(tracks[1]);
		expect(result[2].elements.map((element) => element.elementId)).toEqual(['first', 'last']);
		expect(result[0]).toBe(tracks[0]);
		expect(result[3]).toBe(tracks[2]);
		expect(tracks).toEqual(original);
	});

	it('creates a new row below a populated source row', () => {
		const tracks = makeTracks();
		const original = structuredClone(tracks);
		const moved = tracks[1].elements[1];

		const result = moveElementToAdjacentRow(tracks, { rowIndex: 1, elementIndex: 1 }, 'down', 'new');

		expect(result.map((track) => track.trackId)).toEqual(['before', 'source', 'new', 'after']);
		expect(result[2].elements).toEqual([moved]);
		expect(result[2].elements[0]).toBe(moved);
		expect(result[1]).not.toBe(tracks[1]);
		expect(result[1].elements.map((element) => element.elementId)).toEqual(['first', 'last']);
		expect(result[0]).toBe(tracks[0]);
		expect(result[3]).toBe(tracks[2]);
		expect(tracks).toEqual(original);
	});

	it.each([
		['up', ['source', 'before', 'after']],
		['down', ['before', 'after', 'source']]
	] as const)('swaps a single-element row with the row %s', (direction, expectedTrackIds) => {
		const only = makeElement('only', 2500);
		const tracks: ITimelineTrack[] = [
			{ trackId: 'before', elements: [makeElement('before', 0)] },
			{ trackId: 'source', elements: [only] },
			{ trackId: 'after', elements: [makeElement('after', 5000)] }
		];
		const original = structuredClone(tracks);

		const result = moveElementToAdjacentRow(tracks, { rowIndex: 1, elementIndex: 0 }, direction, 'unused');

		expect(result).not.toBe(tracks);
		expect(result.map((track) => track.trackId)).toEqual(expectedTrackIds);
		expect(result.find((track) => track.trackId === 'source')?.elements[0]).toBe(only);
		expect(tracks).toEqual(original);
	});

	it.each([
		{ rowIndex: 0, direction: 'up' },
		{ rowIndex: 2, direction: 'down' }
	] as const)('keeps a single-element row in place when there is no row to swap with', ({ rowIndex, direction }) => {
		const tracks: ITimelineTrack[] = [
			{ trackId: 'first', elements: [makeElement('first', 0)] },
			{ trackId: 'middle', elements: [makeElement('middle', 2500)] },
			{ trackId: 'last', elements: [makeElement('last', 5000)] }
		];

		const result = moveElementToAdjacentRow(tracks, { rowIndex, elementIndex: 0 }, direction, 'unused');

		expect(result).toBe(tracks);
	});

	it.each([
		{ rowIndex: -1, elementIndex: 0 },
		{ rowIndex: 3, elementIndex: 0 },
		{ rowIndex: 1, elementIndex: -1 },
		{ rowIndex: 1, elementIndex: 3 },
		{ rowIndex: 1.5, elementIndex: 0 },
		{ rowIndex: 1, elementIndex: 1.5 }
	])('returns the original reference for invalid indices: %o', (indices) => {
		const tracks = makeTracks();
		const original = structuredClone(tracks);

		const result = moveElementToAdjacentRow(tracks, indices, 'down', 'new');

		expect(result).toBe(tracks);
		expect(tracks).toEqual(original);
	});
});
