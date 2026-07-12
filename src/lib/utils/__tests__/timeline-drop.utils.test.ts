import { describe, expect, it } from 'vitest';
import type {
	IImageTimelineElementSettings,
	ITimelineElement,
	ITimelineElementBounds
} from '$lib/interfaces/Timeline';
import { MediaType } from '$lib/interfaces/Media';
import { resolveTimelineElementDrop } from '../timeline-drop.utils';

const defaultSettings: IImageTimelineElementSettings = {
	flipHorizontal: false,
	flipVertical: false,
	opacity: 1
};

function makeElement(
	elementId: string,
	playbackStartTime: number,
	duration: number,
	extra: Partial<ITimelineElement> = {}
): ITimelineElement {
	return {
		elementId,
		mediaId: `media-${elementId}`,
		mediaName: `${elementId}.png`,
		mediaImage: `${elementId}-preview.png`,
		type: MediaType.Image,
		duration,
		maxDuration: undefined,
		playbackStartTime,
		trimFromStart: 0,
		trimFromEnd: 0,
		settings: defaultSettings,
		...extra
	};
}

function bounds(start: number, end: number): ITimelineElementBounds {
	return { start, end };
}

function getStarts(elements: ITimelineElement[]): number[] {
	return elements.map((element) => element.playbackStartTime);
}

function getIds(elements: ITimelineElement[]): string[] {
	return elements.map((element) => element.elementId);
}

function expectNoOverlaps(elements: ITimelineElement[]) {
	for (let i = 1; i < elements.length; i += 1) {
		const previous = elements[i - 1];
		const current = elements[i];
		expect(previous.playbackStartTime + previous.duration).toBeLessThanOrEqual(
			current.playbackStartTime
		);
	}
}

describe('resolveTimelineElementDrop', () => {
	it('inserts the dragged element into an available gap without moving existing elements', () => {
		const first = makeElement('first', 0, 1000);
		const second = makeElement('second', 3000, 1000);
		const dragged = makeElement('dragged', 6000, 1000);
		const destination = [first, second, dragged];

		const result = resolveTimelineElementDrop(destination, dragged, bounds(1500, 2500));

		expect(getIds(result)).toEqual(['first', 'dragged', 'second']);
		expect(getStarts(result)).toEqual([0, 1500, 3000]);
		expect(getStarts(destination)).toEqual([0, 3000, 6000]);
	});

	it('pushes the first target right when the drop-zone start edge is in its left half', () => {
		const previous = makeElement('previous', 0, 500);
		const target = makeElement('target', 1000, 2000);
		const following = makeElement('following', 3500, 1000);
		const dragged = makeElement('dragged', 6000, 1000);

		const result = resolveTimelineElementDrop(
			[previous, target, following, dragged],
			dragged,
			bounds(1500, 2500)
		);

		expect(getIds(result)).toEqual(['previous', 'dragged', 'target', 'following']);
		expect(getStarts(result)).toEqual([0, 1500, 2500, 4500]);
		expectNoOverlaps(result);
	});

	it('moves the first target left when the drop-zone start edge is in its right half and a gap is available', () => {
		const previous = makeElement('previous', 0, 1000);
		const target = makeElement('target', 3000, 2000);
		const dragged = makeElement('dragged', 7000, 1000);

		const result = resolveTimelineElementDrop(
			[previous, target, dragged],
			dragged,
			bounds(4500, 5500)
		);

		expect(getIds(result)).toEqual(['previous', 'target', 'dragged']);
		expect(getStarts(result)).toEqual([0, 2500, 4500]);
		expectNoOverlaps(result);
	});

	it('falls back to pushing right when the target cannot fit in the gap on the left', () => {
		const previous = makeElement('previous', 0, 3000);
		const target = makeElement('target', 3000, 2000);
		const dragged = makeElement('dragged', 7000, 1000);

		const result = resolveTimelineElementDrop(
			[previous, target, dragged],
			dragged,
			bounds(4500, 5500)
		);

		expect(getIds(result)).toEqual(['previous', 'dragged', 'target']);
		expect(getStarts(result)).toEqual([0, 4500, 5500]);
		expectNoOverlaps(result);
	});

	it('falls back to pushing right when moving the target left would cross time zero', () => {
		const target = makeElement('target', 1000, 3000);
		const dragged = makeElement('dragged', 6000, 500);

		const result = resolveTimelineElementDrop([target, dragged], dragged, bounds(2500, 3000));

		expect(getIds(result)).toEqual(['dragged', 'target']);
		expect(getStarts(result)).toEqual([2500, 3000]);
		expectNoOverlaps(result);
	});

	it('treats a target fully contained by the drop bounds as an overlap', () => {
		const target = makeElement('target', 3000, 1000);
		const dragged = makeElement('dragged', 7000, 3000);

		const result = resolveTimelineElementDrop([target, dragged], dragged, bounds(2000, 5000));

		expect(getIds(result)).toEqual(['dragged', 'target']);
		expect(getStarts(result)).toEqual([2000, 5000]);
	});

	it('treats the exact target midpoint as the right half', () => {
		const target = makeElement('target', 2000, 2000);
		const dragged = makeElement('dragged', 7000, 1000);

		const result = resolveTimelineElementDrop([target, dragged], dragged, bounds(3000, 4000));

		expect(getIds(result)).toEqual(['target', 'dragged']);
		expect(getStarts(result)).toEqual([1000, 3000]);
	});

	it('moves a first target to time zero when there is enough space before it', () => {
		const target = makeElement('target', 1000, 3000);
		const dragged = makeElement('dragged', 5000, 500);

		const result = resolveTimelineElementDrop([target, dragged], dragged, bounds(3000, 3500));

		expect(getStarts(result)).toEqual([0, 3000]);
	});

	it('cascades later collisions right after moving the first target left', () => {
		const previous = makeElement('previous', 0, 1000);
		const target = makeElement('target', 3000, 2000);
		const following = makeElement('following', 5000, 1500);
		const dragged = makeElement('dragged', 8000, 1500);

		const result = resolveTimelineElementDrop(
			[previous, target, following, dragged],
			dragged,
			bounds(4500, 6000)
		);

		expect(getIds(result)).toEqual(['previous', 'target', 'dragged', 'following']);
		expect(getStarts(result)).toEqual([0, 2500, 4500, 6000]);
		expectNoOverlaps(result);
	});

	it('does not treat the dragged element at its old index as a predecessor when moving it right', () => {
		const dragged = makeElement('dragged', 0, 1000);
		const target = makeElement('target', 3000, 2000);
		const result = resolveTimelineElementDrop([dragged, target], dragged, bounds(4000, 5000));

		expect(getIds(result)).toEqual(['target', 'dragged']);
		expect(getStarts(result)).toEqual([2000, 4000]);
	});

	it('does not treat the dragged element at its old index as a predecessor when moving it left', () => {
		const first = makeElement('first', 0, 1000);
		const dragged = makeElement('dragged', 5000, 1000);
		const target = makeElement('target', 7000, 2000);
		const result = resolveTimelineElementDrop(
			[first, dragged, target],
			dragged,
			bounds(8000, 9000)
		);

		expect(getIds(result)).toEqual(['first', 'target', 'dragged']);
		expect(getStarts(result)).toEqual([0, 6000, 8000]);
	});

	it('inserts a cross-track drop while preserving the dragged element metadata', () => {
		const target = makeElement('target', 3000, 2000);
		const dragged = makeElement('dragged', 0, 1000, {
			mediaName: 'preserved-name.png',
			trimFromStart: 250,
			trimFromEnd: 125
		});

		const result = resolveTimelineElementDrop([target], dragged, bounds(4500, 5500));
		const resolvedDragged = result.find((element) => element.elementId === dragged.elementId);

		expect(resolvedDragged).toMatchObject({
			mediaName: 'preserved-name.png',
			trimFromStart: 250,
			trimFromEnd: 125,
			playbackStartTime: 4500
		});
		expectNoOverlaps(result);
	});
});
