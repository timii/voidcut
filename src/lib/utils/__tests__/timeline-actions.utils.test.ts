import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { MediaType } from '$lib/interfaces/Media';
import type { ITimelineElement, ITimelineTrack } from '$lib/interfaces/Timeline';
import {
	currentPlaybackTime,
	maxPlaybackTime,
	previewPlaying,
	selectedElement,
	timelineTracks
} from '../../../stores/store';
import {
	deleteSelectedTimelineElement,
	duplicateSelectedTimelineElement,
	nudgeSelectedTimelineElement,
	skipPlayhead,
	splitSelectedTimelineElement,
	stepPlayhead
} from '../timeline-actions.utils';
import { timelineHistory } from '../timeline-history.utils';

const settings = {
	flipHorizontal: false,
	flipVertical: false,
	opacity: 1
};

function makeElement(
	elementId: string,
	playbackStartTime: number,
	duration = 1000
): ITimelineElement {
	return {
		elementId,
		mediaId: `media-${elementId}`,
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

function setTrack(elements: ITimelineElement[]) {
	timelineTracks.set([{ trackId: 'track', elements }]);
}

beforeEach(() => {
	timelineTracks.set([]);
	selectedElement.set({ elementId: '' });
	previewPlaying.set(false);
	currentPlaybackTime.set(0);
	maxPlaybackTime.set(0);
	timelineHistory.reset();
});

describe('stepPlayhead', () => {
	it.each([
		[25, 'backward', 0],
		[975, 'forward', 1000],
		[500, 'backward', 450],
		[500, 'forward', 550]
	] as const)('steps from %i %s and clamps to bounds', (start, direction, expected) => {
		currentPlaybackTime.set(start);
		maxPlaybackTime.set(1000);
		previewPlaying.set(true);

		stepPlayhead(direction);

		expect(get(currentPlaybackTime)).toBe(expected);
		expect(get(previewPlaying)).toBe(false);
	});
});

describe('skipPlayhead', () => {
	it.each([
		['start', 0],
		['end', 1000]
	] as const)('pauses and skips to the timeline %s', (destination, expected) => {
		currentPlaybackTime.set(500);
		maxPlaybackTime.set(1000);
		previewPlaying.set(true);

		skipPlayhead(destination);

		expect(get(currentPlaybackTime)).toBe(expected);
		expect(get(previewPlaying)).toBe(false);
	});
});

describe('nudgeSelectedTimelineElement', () => {
	it('moves the selected element by 50ms in open space', () => {
		setTrack([makeElement('selected', 500)]);
		selectedElement.set({ elementId: 'selected', mediaType: MediaType.Image });

		nudgeSelectedTimelineElement('right');

		expect(get(timelineTracks)[0].elements[0].playbackStartTime).toBe(550);
	});

	it('clamps left at the timeline start with a partial final movement', () => {
		setTrack([makeElement('selected', 25)]);
		selectedElement.set({ elementId: 'selected' });

		nudgeSelectedTimelineElement('left');

		expect(get(timelineTracks)[0].elements[0].playbackStartTime).toBe(0);
	});

	it('clamps left at the previous element end without moving the neighbor', () => {
		setTrack([makeElement('previous', 0), makeElement('selected', 1025)]);
		selectedElement.set({ elementId: 'selected' });

		nudgeSelectedTimelineElement('left');

		const elements = get(timelineTracks)[0].elements;
		expect(elements[0].playbackStartTime).toBe(0);
		expect(elements[1].playbackStartTime).toBe(1000);
	});

	it('clamps right at the next element start minus duration without moving the neighbor', () => {
		setTrack([makeElement('selected', 0), makeElement('next', 1025)]);
		selectedElement.set({ elementId: 'selected' });

		nudgeSelectedTimelineElement('right');

		const elements = get(timelineTracks)[0].elements;
		expect(elements[0].playbackStartTime).toBe(25);
		expect(elements[1].playbackStartTime).toBe(1025);
	});

	it('is a safe no-op for a missing selection or during playback', () => {
		const tracks: ITimelineTrack[] = [{ trackId: 'track', elements: [makeElement('only', 500)] }];
		timelineTracks.set(tracks);

		nudgeSelectedTimelineElement('right');
		selectedElement.set({ elementId: 'only' });
		previewPlaying.set(true);
		nudgeSelectedTimelineElement('right');

		expect(get(timelineTracks)[0].elements[0].playbackStartTime).toBe(500);
	});
});

describe('shared timeline editing actions', () => {
	it('deletes the selected element and clears selection', () => {
		setTrack([makeElement('first', 0), makeElement('selected', 1000)]);
		selectedElement.set({ elementId: 'selected' });

		deleteSelectedTimelineElement();

		expect(get(timelineTracks)[0].elements.map((element) => element.elementId)).toEqual(['first']);
		expect(get(selectedElement).elementId).toBe('');
	});

	it('undoes deletion with the original selection', () => {
		setTrack([makeElement('first', 0), makeElement('selected', 1000)]);
		selectedElement.set({ elementId: 'selected', mediaType: MediaType.Image });

		deleteSelectedTimelineElement();
		timelineHistory.undo();

		expect(get(timelineTracks)[0].elements.map((element) => element.elementId)).toEqual([
			'first',
			'selected'
		]);
		expect(get(selectedElement)).toEqual({
			elementId: 'selected',
			mediaType: MediaType.Image
		});
	});

	it('does not delete during playback or without a valid selection', () => {
		setTrack([makeElement('only', 0)]);
		selectedElement.set({ elementId: 'missing' });
		deleteSelectedTimelineElement();
		selectedElement.set({ elementId: 'only' });
		previewPlaying.set(true);
		deleteSelectedTimelineElement();

		expect(get(timelineTracks)[0].elements).toHaveLength(1);
	});

	it('splits only when the playhead is over the selected element', () => {
		setTrack([makeElement('selected', 0, 2000)]);
		selectedElement.set({ elementId: 'selected' });
		currentPlaybackTime.set(1000);

		splitSelectedTimelineElement();

		const elements = get(timelineTracks)[0].elements;
		expect(elements).toHaveLength(2);
		expect(elements.map((element) => element.duration)).toEqual([1000, 1000]);
		expect(elements[1].playbackStartTime).toBe(1000);
	});

	it('does not split at an invalid playhead position or during playback', () => {
		setTrack([makeElement('selected', 0, 2000)]);
		selectedElement.set({ elementId: 'selected' });
		currentPlaybackTime.set(100);
		splitSelectedTimelineElement();
		currentPlaybackTime.set(1000);
		previewPlaying.set(true);
		splitSelectedTimelineElement();

		expect(get(timelineTracks)[0].elements).toHaveLength(1);
	});

	it('duplicates into the next available space and preserves the original selection', () => {
		setTrack([
			makeElement('selected', 0, 500),
			makeElement('blocking', 500, 500),
			makeElement('later', 2000, 500)
		]);
		selectedElement.set({ elementId: 'selected' });

		duplicateSelectedTimelineElement();

		const elements = get(timelineTracks)[0].elements;
		expect(elements).toHaveLength(4);
		expect(elements[2].playbackStartTime).toBe(1000);
		expect(get(selectedElement).elementId).toBe('selected');
	});

	it('does not duplicate without a valid selection', () => {
		setTrack([makeElement('only', 0)]);
		selectedElement.set({ elementId: 'missing' });

		duplicateSelectedTimelineElement();

		expect(get(timelineTracks)[0].elements).toHaveLength(1);
	});
});
