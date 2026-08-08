import type { IMedia } from '$lib/interfaces/Media';
import type { IPlayerElement } from '$lib/interfaces/Player';
import type { ITimelineTrack } from '$lib/interfaces/Timeline';

export const PREVIEW_PRELOAD_WINDOW_MS = 3000;

export interface IManagedPreviewElement extends IPlayerElement {
	active: boolean;
	layerIndex: number;
}

export function getManagedPreviewSignature(elements: IManagedPreviewElement[]): string {
	return elements
		.map((element) => `${element.elementId}:${element.active}:${element.layerIndex}`)
		.join('|');
}

export function getManagedPreviewElements(
	tracks: ITimelineTrack[],
	media: IMedia[],
	timeMs: number,
	preloadWindowMs = PREVIEW_PRELOAD_WINDOW_MS
): IManagedPreviewElement[] {
	const mediaById = new Map(media.map((item) => [item.mediaId, item]));

	return tracks.flatMap((track, trackIndex) => {
		const availableElements = track.elements.filter((element) => mediaById.has(element.mediaId));
		// exclusive end bounds prevent adjacent clips from being active on the same frame
		const activeElements = availableElements.filter(
			(element) =>
				timeMs >= element.playbackStartTime && timeMs < element.playbackStartTime + element.duration
		);
		// one upcoming clip per track bounds decoder work while still preparing the next cut
		const upcomingElement = availableElements.find(
			(element) =>
				element.playbackStartTime > timeMs && element.playbackStartTime - timeMs <= preloadWindowMs
		);
		const managedElements = upcomingElement ? [...activeElements, upcomingElement] : activeElements;

		return managedElements.map((element) => ({
			...element,
			src: mediaById.get(element.mediaId)?.src,
			active: activeElements.includes(element),
			// track-derived layers stay stable when the managed set changes
			layerIndex: tracks.length - trackIndex
		}));
	});
}
