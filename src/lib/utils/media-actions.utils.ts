import { get } from 'svelte/store';
import { availableMedia, selectedElement, timelineTracks } from '../../stores/store';
import { timelineHistory } from './timeline-history.utils';

export function deleteMediaFromProject(mediaId: string): boolean {
	if (!get(availableMedia).some((media) => media.mediaId === mediaId)) {
		return false;
	}

	availableMedia.update((media) => media.filter((item) => item.mediaId !== mediaId));
	const nextTracks = get(timelineTracks)
		.map((track) => ({
			...track,
			elements: track.elements.filter((element) => element.mediaId !== mediaId)
		}))
		.filter((track) => track.elements.length > 0);
	timelineTracks.set(nextTracks);

	const selectedId = get(selectedElement).elementId;
	const selectionStillExists = nextTracks.some((track) =>
		track.elements.some((element) => element.elementId === selectedId)
	);
	if (!selectionStillExists) {
		selectedElement.set({ elementId: '', mediaType: undefined });
	}

	// deleting source media invalidates older timeline snapshots that reference it
	timelineHistory.reset();
	return true;
}
