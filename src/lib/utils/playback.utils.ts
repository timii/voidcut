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

let playbackInterval: ReturnType<typeof adjustingInterval> | undefined;

// #region playback
// stop the single timer that owns timeline playback
export function pausePlayback() {
	previewPlaying.set(false);
	if (playbackInterval) {
		playbackInterval.stop();
		playbackInterval = undefined;
	}
}

export function resumePlayback() {
	// only one timer may publish timeline time
	if (get(previewPlaying)) {
		return;
	}

	previewPlaying.set(true);
	playbackInterval = adjustingInterval(
		() => {
			const nextTime = Math.min(
				get(currentPlaybackTime) + CONSTS.playbackIntervalTimer,
				get(maxPlaybackTime)
			);
			currentPlaybackTime.set(nextTime);

			if (nextTime >= get(maxPlaybackTime)) {
				pausePlayback();
			}
		},
		CONSTS.playbackIntervalTimer,
		() => undefined
	);
	playbackInterval.start();
}

// check if the current playback time is inside given element bounds
export function isPlaybackInElement(el: IPlayerElement, timeMs: number): boolean {
	// calculate element bounds using the playback start time and the duration
	const elBounds: ITimelineElementBounds = {
		start: el.playbackStartTime,
		end: el.playbackStartTime + el.duration
	};

	// return if the current playback time is between the start and end time of the element
	return timeMs >= elBounds.start && timeMs < elBounds.end;
}

// get the current element time for a given media element
export function getCurrentMediaTime(el: IPlayerElement, timeMs: number): number {
	// get the start time of the element considering the playback start time and the left trim
	const speed = getTimelineElementSpeed(el);
	const timelineElapsed = timeMs - el.playbackStartTime;
	const mediaTimeInMs = el.trimFromStart + timelineElapsed * speed;

	// calculate the time where from where the media element should be played
	return mediaTimeInMs / CONSTS.secondsMultiplier;
}

export function getFadeVolumeMultiplier(el: IPlayerElement, timeMs: number): number {
	if (el.type !== MediaType.Audio) {
		return 1;
	}

	const settings = normalizeTimelineElementSettings(el) as IAudioTimelineElementSettings;
	const elapsed = timeMs - el.playbackStartTime;
	const remaining = el.playbackStartTime + el.duration - timeMs;
	let multiplier = 1;

	if (settings.fadeInMs > 0 && elapsed < settings.fadeInMs) {
		multiplier = Math.min(multiplier, Math.max(0, elapsed / settings.fadeInMs));
	}

	if (settings.fadeOutMs > 0 && remaining < settings.fadeOutMs) {
		multiplier = Math.min(multiplier, Math.max(0, remaining / settings.fadeOutMs));
	}

	return multiplier;
}
