import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import { MediaType, type IMedia } from '$lib/interfaces/Media';
import type { ITimelineElement } from '$lib/interfaces/Timeline';
import { availableMedia, selectedElement, timelineTracks } from '../../../stores/store';
import { deleteMediaFromProject } from '../media-actions.utils';
import { timelineHistory } from '../timeline-history.utils';

const media: IMedia = {
	mediaId: 'media',
	name: 'image.png',
	type: MediaType.Image,
	loaded: true,
	previewImage: 'preview',
	src: 'source'
};

const element: ITimelineElement = {
	elementId: 'element',
	mediaId: media.mediaId,
	mediaName: media.name,
	mediaImage: media.previewImage,
	type: MediaType.Image,
	duration: 1000,
	maxDuration: undefined,
	playbackStartTime: 0,
	trimFromStart: 0,
	trimFromEnd: 0,
	settings: { flipHorizontal: false, flipVertical: false, opacity: 1 }
};

beforeEach(() => {
	availableMedia.set([media]);
	timelineTracks.set([{ trackId: 'track', elements: [element] }]);
	selectedElement.set({ elementId: element.elementId, mediaType: MediaType.Image });
	timelineHistory.reset();
});

describe('deleteMediaFromProject', () => {
	it('removes source media and clips, clears selection, and resets history', () => {
		timelineHistory.run(() => timelineTracks.set([{ trackId: 'changed', elements: [element] }]));

		expect(deleteMediaFromProject(media.mediaId)).toBe(true);
		expect(get(availableMedia)).toEqual([]);
		expect(get(timelineTracks)).toEqual([]);
		expect(get(selectedElement)).toEqual({ elementId: '', mediaType: undefined });
		expect(timelineHistory.undo()).toBe(false);
	});
});
