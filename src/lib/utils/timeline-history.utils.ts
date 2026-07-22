import { get } from 'svelte/store';
import type { ISelectedElement, ITimelineElement, ITimelineTrack } from '$lib/interfaces/Timeline';
import { selectedElement, timelineTracks } from '../../stores/store';
import { createHistory, type HistoryAdapter } from './history.utils';

export interface TimelineHistorySnapshot {
	tracks: ITimelineTrack[];
	selection: ISelectedElement;
}

const timelineHistoryAdapter: HistoryAdapter<TimelineHistorySnapshot> = {
	capture: () => ({
		tracks: get(timelineTracks),
		selection: get(selectedElement)
	}),
	restore: (snapshot) => {
		// snapshots share immutable media fields while restoring both editor stores atomically
		timelineTracks.set(snapshot.tracks);
		selectedElement.set(snapshot.selection);
		return true;
	},
	// selection belongs to an edit snapshot but selecting a clip alone is not an undoable edit
	equals: (left, right) => timelineTracksEqual(left.tracks, right.tracks)
};

export const timelineHistory = createHistory(timelineHistoryAdapter, { limit: 100 });

export function runTimelineEdit<TResult>(change: () => TResult): TResult {
	// active gestures keep their intermediate updates inside one pending history entry
	return get(timelineHistory.transactionActive)
		? timelineHistory.update(change)
		: timelineHistory.run(change);
}

function timelineTracksEqual(left: ITimelineTrack[], right: ITimelineTrack[]): boolean {
	if (left === right) {
		return true;
	}
	if (left.length !== right.length) {
		return false;
	}

	return left.every((track, trackIndex) => {
		const otherTrack = right[trackIndex];
		return (
			track.trackId === otherTrack.trackId &&
			track.elements.length === otherTrack.elements.length &&
			track.elements.every((element, elementIndex) =>
				timelineElementsEqual(element, otherTrack.elements[elementIndex])
			)
		);
	});
}

function timelineElementsEqual(left: ITimelineElement, right: ITimelineElement): boolean {
	return (
		left === right ||
		(left.elementId === right.elementId &&
			left.mediaId === right.mediaId &&
			left.mediaName === right.mediaName &&
			left.mediaImage === right.mediaImage &&
			left.timelineImage === right.timelineImage &&
			arrayEqual(left.timelineFrames, right.timelineFrames) &&
			left.type === right.type &&
			left.duration === right.duration &&
			left.maxDuration === right.maxDuration &&
			left.playbackStartTime === right.playbackStartTime &&
			left.trimFromStart === right.trimFromStart &&
			left.trimFromEnd === right.trimFromEnd &&
			JSON.stringify(left.settings) === JSON.stringify(right.settings))
	);
}

function arrayEqual(left: string[] | undefined, right: string[] | undefined): boolean {
	return (
		left === right ||
		(!!left &&
			!!right &&
			left.length === right.length &&
			left.every((value, index) => value === right[index]))
	);
}
