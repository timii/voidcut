import type { IPlayerElement } from '$lib/interfaces/Player';
import type { ITimelineElementBounds } from '$lib/interfaces/Timeline';
import { get } from 'svelte/store';
import { previewPlaying, currentPlaybackTime, maxPlaybackTime } from '../../stores/store';
import { adjustingInterval } from './adjusting-interval';
import { CONSTS } from './consts';
import { MediaType } from '$lib/interfaces/Media';
import type { IAudioTimelineElementSettings } from '$lib/interfaces/Timeline';
import {
	getTimelineElementSpeed,
	normalizeTimelineElementSettings
} from './timeline-settings.utils';

let interval: {
	start: () => void;
	stop: () => void;
};

// #region playback
// stop interval that handles the current playback time
export function pausePlayback() {
	previewPlaying.set(false);
	if (interval) {
		interval.stop();
	}
}

// create interval that increases current playback time
export function resumePlayback() {
	previewPlaying.set(true);
	const intervallCallback = () => {
		const previousValue = get(currentPlaybackTime);
		const nextValue = previousValue + CONSTS.playbackIntervalTimer;

		// pause playback if its after the max playback time
		if (nextValue > get(maxPlaybackTime)) {
			pausePlayback();
		} else {
			// increase the current playback time in store by timeout amount
			currentPlaybackTime.update((value) => value + CONSTS.playbackIntervalTimer);
		}
	};

	const doError = () => {
		// console.warn('The drift exceeded the interval.');
	};

	// create new interval with callbacks
	interval = adjustingInterval(intervallCallback, CONSTS.playbackIntervalTimer, doError);

	// manually start the intervals
	interval.start();
}

// check if the current playback time is inside given element bounds
export function isPlaybackInElement(el: IPlayerElement): boolean {
	// calculate element bounds using the playback start time and the duration
	const elBounds: ITimelineElementBounds = {
		start: el.playbackStartTime,
		end: el.playbackStartTime + el.duration
	};

	const playbackTime = get(currentPlaybackTime);

	// return if the current playback time is between the start and end time of the element
	return playbackTime >= elBounds.start && playbackTime < elBounds.end;
}

// get the current element time for a given media element
export function getCurrentMediaTime(el: IPlayerElement): number {
	// get the start time of the element considering the playback start time and the left trim
	const speed = getTimelineElementSpeed(el);
	const timelineElapsed = get(currentPlaybackTime) - el.playbackStartTime;
	const mediaTimeInMs = el.trimFromStart + timelineElapsed * speed;

	// calculate the time where from where the media element should be played
	return mediaTimeInMs / CONSTS.secondsMultiplier;
}

export function getFadeVolumeMultiplier(el: IPlayerElement): number {
	if (el.type !== MediaType.Audio) {
		return 1;
	}

	const settings = normalizeTimelineElementSettings(el) as IAudioTimelineElementSettings;
	const playbackTime = get(currentPlaybackTime);
	const elapsed = playbackTime - el.playbackStartTime;
	const remaining = el.playbackStartTime + el.duration - playbackTime;
	let multiplier = 1;

	if (settings.fadeInMs > 0 && elapsed < settings.fadeInMs) {
		multiplier = Math.min(multiplier, Math.max(0, elapsed / settings.fadeInMs));
	}

	if (settings.fadeOutMs > 0 && remaining < settings.fadeOutMs) {
		multiplier = Math.min(multiplier, Math.max(0, remaining / settings.fadeOutMs));
	}

	return multiplier;
}
