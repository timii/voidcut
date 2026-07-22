import { get } from 'svelte/store';
import type { ITimelineElement } from '$lib/interfaces/Timeline';
import {
	currentPlaybackTime,
	maxPlaybackTime,
	previewPlaying,
	selectedElement,
	timelineTracks
} from '../../stores/store';
import { CONSTS } from './consts';
import { pausePlayback, resumePlayback } from './playback.utils';
import { getTimelineElementSpeed } from './timeline-settings.utils';
import { getIndexOfSelectedElementInTracks, thumbOverSelectedElement } from './timeline.utils';
import { elementIsAnImage, generateId } from './utils';
import { runTimelineEdit, timelineHistory } from './timeline-history.utils';

export type HorizontalDirection = 'left' | 'right';
export type PlayheadDirection = 'backward' | 'forward';
export type PlayheadDestination = 'start' | 'end';

export function undoTimelineEdit(): boolean {
	return !get(previewPlaying) && timelineHistory.undo();
}

export function redoTimelineEdit(): boolean {
	return !get(previewPlaying) && timelineHistory.redo();
}

export function skipPlayhead(destination: PlayheadDestination): number {
	pausePlayback();

	const nextTime = destination === 'start' ? 0 : get(maxPlaybackTime);
	currentPlaybackTime.set(nextTime);
	return nextTime;
}

export function stepPlayhead(direction: PlayheadDirection): number {
	pausePlayback();

	const offset =
		direction === 'backward' ? -CONSTS.playbackIntervalTimer : CONSTS.playbackIntervalTimer;
	const nextTime = Math.min(get(maxPlaybackTime), Math.max(0, get(currentPlaybackTime) + offset));

	currentPlaybackTime.set(nextTime);
	return nextTime;
}

export function togglePlayback(): boolean {
	if (get(previewPlaying)) {
		pausePlayback();
		return true;
	}

	if (get(timelineTracks).length === 0 || get(currentPlaybackTime) >= get(maxPlaybackTime)) {
		return false;
	}

	resumePlayback();
	return true;
}

export function deleteSelectedTimelineElement(): boolean {
	if (get(previewPlaying)) {
		return false;
	}

	const indices = getIndexOfSelectedElementInTracks();
	if (!indices) {
		return false;
	}

	runTimelineEdit(() => {
		timelineTracks.update((tracks) => {
			const track = tracks[indices.rowIndex];
			const updatedElements = track.elements.filter((_, index) => index !== indices.elementIndex);

			if (updatedElements.length === 0) {
				return tracks.filter((_, index) => index !== indices.rowIndex);
			}

			return tracks.map((currentTrack, index) =>
				index === indices.rowIndex ? { ...currentTrack, elements: updatedElements } : currentTrack
			);
		});
		selectedElement.set({ mediaType: undefined, elementId: '' });
		return true;
	});
	return true;
}

export function splitSelectedTimelineElement(): boolean {
	if (get(previewPlaying)) {
		return false;
	}

	const timeOverElement = thumbOverSelectedElement();
	const indices = getIndexOfSelectedElementInTracks();
	if (timeOverElement < 0 || !indices) {
		return false;
	}

	runTimelineEdit(() => timelineTracks.update((tracks) => {
		const track = tracks[indices.rowIndex];
		const element = track.elements[indices.elementIndex];
		const newElement: ITimelineElement = { ...element, elementId: generateId() };
		let newTrimFromStart = element.trimFromStart;
		let newTrimFromEnd = element.trimFromEnd;

		// convert timeline time to source-media time so both halves keep the correct trim at any speed
		if (!elementIsAnImage(element)) {
			const speed = getTimelineElementSpeed(element);
			newTrimFromStart = element.trimFromStart + Math.round(timeOverElement * speed);
			newTrimFromEnd =
				element.trimFromEnd + Math.round((element.duration - timeOverElement) * speed);
		}

		const leftElement: ITimelineElement = {
			...element,
			duration: timeOverElement,
			trimFromEnd: newTrimFromEnd
		};
		const rightElement: ITimelineElement = {
			...newElement,
			duration: element.duration - timeOverElement,
			playbackStartTime: element.playbackStartTime + timeOverElement,
			trimFromStart: newTrimFromStart
		};
		const updatedElements = [...track.elements];
		updatedElements.splice(indices.elementIndex, 1, leftElement, rightElement);

		return tracks.map((currentTrack, index) =>
			index === indices.rowIndex ? { ...currentTrack, elements: updatedElements } : currentTrack
		);
	}));
	return true;
}

export function duplicateSelectedTimelineElement(): boolean {
	const indices = getIndexOfSelectedElementInTracks();
	if (!indices) {
		return false;
	}

	let duplicated = false;
	runTimelineEdit(() => timelineTracks.update((tracks) => {
		const track = tracks[indices.rowIndex];
		const elements = track.elements;
		const selected = elements[indices.elementIndex];
		const duplicate: ITimelineElement = { ...selected, elementId: generateId() };

		// search forward from the selection and use the first gap large enough for the duplicate
		for (let index = indices.elementIndex; index < elements.length; index++) {
			const current = elements[index];
			const currentEnd = current.playbackStartTime + current.duration;
			const nextStart = elements[index + 1]?.playbackStartTime;

			if (nextStart === undefined || nextStart - currentEnd > duplicate.duration) {
				const duplicatedElement = { ...duplicate, playbackStartTime: currentEnd };
				duplicated = true;
				const updatedElements = [...elements];
				updatedElements.splice(index + 1, 0, duplicatedElement);
				return tracks.map((currentTrack, trackIndex) =>
					trackIndex === indices.rowIndex
						? { ...currentTrack, elements: updatedElements }
						: currentTrack
				);
			}
		}

		return tracks;
	}));

	return duplicated;
}

export function nudgeSelectedTimelineElement(direction: HorizontalDirection): boolean {
	if (get(previewPlaying)) {
		return false;
	}

	const indices = getIndexOfSelectedElementInTracks();
	if (!indices) {
		return false;
	}

	let changed = false;
	runTimelineEdit(() => timelineTracks.update((tracks) => {
		const track = tracks[indices.rowIndex];
		const element = track.elements[indices.elementIndex];
		const previous = track.elements[indices.elementIndex - 1];
		const next = track.elements[indices.elementIndex + 1];
		const minimumStart = previous ? previous.playbackStartTime + previous.duration : 0;
		const maximumStart = next
			? next.playbackStartTime - element.duration
			: Number.POSITIVE_INFINITY;
		const offset =
			direction === 'left' ? -CONSTS.playbackIntervalTimer : CONSTS.playbackIntervalTimer;
		// clamp partial frame movement flush against the nearest clip boundary
		const nextStart = Math.min(
			maximumStart,
			Math.max(minimumStart, element.playbackStartTime + offset)
		);

		if (nextStart === element.playbackStartTime) {
			return tracks;
		}

		changed = true;
		const updatedElements = track.elements.map((currentElement, index) =>
			index === indices.elementIndex
				? { ...currentElement, playbackStartTime: nextStart }
				: currentElement
		);
		return tracks.map((currentTrack, index) =>
			index === indices.rowIndex ? { ...currentTrack, elements: updatedElements } : currentTrack
		);
	}));

	return changed;
}
