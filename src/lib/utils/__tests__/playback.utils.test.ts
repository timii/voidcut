import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { MediaType } from '$lib/interfaces/Media';
import type { ITimelineElement } from '$lib/interfaces/Timeline';
import { currentPlaybackTime, maxPlaybackTime, previewPlaying } from '../../../stores/store';
import {
	getCurrentMediaTime,
	getFadeVolumeMultiplier,
	isPlaybackInElement,
	pausePlayback,
	resumePlayback
} from '../playback.utils';

function makeVideo(): ITimelineElement {
	return {
		elementId: 'video',
		mediaId: 'media-video',
		mediaName: 'video.mp4',
		mediaImage: 'video.png',
		type: MediaType.Video,
		duration: 2000,
		maxDuration: 5000,
		playbackStartTime: 1000,
		trimFromStart: 500,
		trimFromEnd: 500,
		settings: {
			flipHorizontal: false,
			flipVertical: false,
			volume: 1,
			speed: 2,
			opacity: 1
		}
	};
}

function makeAudio(): ITimelineElement {
	return {
		elementId: 'audio',
		mediaId: 'media-audio',
		mediaName: 'audio.mp3',
		mediaImage: 'audio.png',
		type: MediaType.Audio,
		duration: 2000,
		maxDuration: 2000,
		playbackStartTime: 1000,
		trimFromStart: 0,
		trimFromEnd: 0,
		settings: {
			volume: 1,
			fadeInMs: 1000,
			fadeOutMs: 500,
			speed: 1
		}
	};
}

describe('playback calculations', () => {
	it('uses explicit time and exclusive end bounds for element activity', () => {
		const element = makeVideo();

		expect(isPlaybackInElement(element, 1000)).toBe(true);
		expect(isPlaybackInElement(element, 3000)).toBe(false);
	});

	it('maps timeline time to trimmed source time at the configured speed', () => {
		expect(getCurrentMediaTime(makeVideo(), 1250)).toBe(1);
	});

	it('calculates audio fades from the supplied timeline time', () => {
		const element = makeAudio();

		expect(getFadeVolumeMultiplier(element, 1500)).toBe(0.5);
		expect(getFadeVolumeMultiplier(element, 2750)).toBe(0.5);
	});
});

describe('playback clock', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		pausePlayback();
		currentPlaybackTime.set(500);
		maxPlaybackTime.set(1000);
		previewPlaying.set(false);
		vi.stubGlobal(
			'requestAnimationFrame',
			vi.fn(() => 1)
		);
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
	});

	afterEach(() => {
		pausePlayback();
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('keeps only one fixed-cadence timer across repeated resumes', () => {
		resumePlayback();
		resumePlayback();

		expect(vi.getTimerCount()).toBe(1);
		expect(get(previewPlaying)).toBe(true);
	});

	it('advances timeline time in stable 50ms steps', () => {
		resumePlayback();
		vi.advanceTimersByTime(49);
		expect(get(currentPlaybackTime)).toBe(500);

		vi.advanceTimersByTime(1);
		expect(get(currentPlaybackTime)).toBe(550);

		vi.advanceTimersByTime(50);
		expect(get(currentPlaybackTime)).toBe(600);
	});

	it('clamps exactly at the timeline end', () => {
		maxPlaybackTime.set(575);
		resumePlayback();
		vi.advanceTimersByTime(100);

		expect(get(currentPlaybackTime)).toBe(575);
		expect(get(previewPlaying)).toBe(false);
	});

	it('continues from an externally moved playhead', () => {
		resumePlayback();
		currentPlaybackTime.set(200);
		vi.advanceTimersByTime(50);

		expect(get(currentPlaybackTime)).toBe(250);
	});
});
