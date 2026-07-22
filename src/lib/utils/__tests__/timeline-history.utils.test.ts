import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ITimelineTrack } from '$lib/interfaces/Timeline';
import { selectedElement, timelineTracks } from '../../../stores/store';
import { timelineHistory } from '../timeline-history.utils';

function track(trackId: string): ITimelineTrack {
	return { trackId, elements: [] };
}

beforeEach(() => {
	timelineTracks.set([]);
	selectedElement.set({ elementId: '' });
	timelineHistory.reset();
});

describe('timelineHistory', () => {
	it('restores timeline tracks and the selection captured with an edit', () => {
		const originalTracks = [track('original')];
		timelineTracks.set(originalTracks);
		selectedElement.set({ elementId: 'selected' });

		timelineHistory.run(() => {
			timelineTracks.set([track('changed')]);
			selectedElement.set({ elementId: '' });
		});

		expect(timelineHistory.undo()).toBe(true);
		expect(get(timelineTracks)).toBe(originalTracks);
		expect(get(selectedElement)).toEqual({ elementId: 'selected' });
	});

	it('does not record selection-only changes', () => {
		selectedElement.set({ elementId: 'before' });

		timelineHistory.run(() => selectedElement.set({ elementId: 'after' }));

		expect(timelineHistory.undo()).toBe(false);
		expect(get(selectedElement)).toEqual({ elementId: 'after' });
	});

	it('does not record structurally equivalent timeline arrays', () => {
		timelineTracks.set([track('same')]);

		timelineHistory.run(() => timelineTracks.set([{ trackId: 'same', elements: [] }]));

		expect(timelineHistory.undo()).toBe(false);
	});
});
