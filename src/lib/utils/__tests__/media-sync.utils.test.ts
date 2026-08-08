import { describe, expect, it } from 'vitest';
import {
	MEDIA_DRIFT_CHECK_INTERVAL_MS,
	MEDIA_SYNC_INTERVAL_MS,
	getMediaSyncActions,
	hasPlaybackTimeJumped,
	shouldCheckMediaDrift,
	shouldRunMediaSync
} from '../media-sync.utils';

const playingInput = {
	active: true,
	playing: true,
	paused: false,
	seeking: false,
	playPending: false,
	driftSeconds: 0.5,
	checkDrift: true,
	forceSeek: false,
	timeSinceCorrectionMs: 1000
};

describe('getMediaSyncActions', () => {
	it('does not issue another seek while the decoder is already seeking', () => {
		expect(getMediaSyncActions({ ...playingInput, seeking: true })).toEqual({
			pause: false,
			seek: false,
			play: false
		});
	});

	it('enforces a cooldown between drift corrections', () => {
		expect(getMediaSyncActions({ ...playingInput, timeSinceCorrectionMs: 100 }).seek).toBe(false);
		expect(getMediaSyncActions({ ...playingInput, timeSinceCorrectionMs: 500 }).seek).toBe(true);
	});

	it('does not overlap asynchronous play requests', () => {
		expect(getMediaSyncActions({ ...playingInput, paused: true, playPending: true }).play).toBe(
			false
		);
		expect(getMediaSyncActions({ ...playingInput, paused: true, playPending: false }).play).toBe(
			true
		);
	});

	it('pauses and seeks active media when timeline playback is paused', () => {
		expect(getMediaSyncActions({ ...playingInput, playing: false })).toEqual({
			pause: true,
			seek: true,
			play: false
		});
	});

	it('keeps upcoming media paused without repeatedly seeking it', () => {
		expect(getMediaSyncActions({ ...playingInput, active: false })).toEqual({
			pause: true,
			seek: false,
			play: false
		});
	});

	it('does not pause inactive media that is already paused', () => {
		expect(getMediaSyncActions({ ...playingInput, active: false, paused: true }).pause).toBe(false);
	});

	it('checks drift only when the slower correction pass is due', () => {
		expect(getMediaSyncActions({ ...playingInput, checkDrift: false }).seek).toBe(false);
	});
});

describe('shouldRunMediaSync', () => {
	it('skips ordinary animation frames until the sync interval elapses', () => {
		expect(
			shouldRunMediaSync({
				playing: true,
				playbackChanged: false,
				managedSetChanged: false,
				timeJumped: false,
				elapsedMs: MEDIA_SYNC_INTERVAL_MS - 1
			})
		).toBe(false);
		expect(
			shouldRunMediaSync({
				playing: true,
				playbackChanged: false,
				managedSetChanged: false,
				timeJumped: false,
				elapsedMs: MEDIA_SYNC_INTERVAL_MS
			})
		).toBe(true);
	});

	it('runs immediately for paused scrubbing and playback state changes', () => {
		expect(
			shouldRunMediaSync({
				playing: false,
				playbackChanged: false,
				managedSetChanged: false,
				timeJumped: false,
				elapsedMs: 0
			})
		).toBe(true);
		expect(
			shouldRunMediaSync({
				playing: true,
				playbackChanged: true,
				managedSetChanged: false,
				timeJumped: false,
				elapsedMs: 0
			})
		).toBe(true);
	});
});

describe('shouldCheckMediaDrift', () => {
	it('uses a slower cadence for decoder corrections', () => {
		expect(
			shouldCheckMediaDrift({ force: false, elapsedMs: MEDIA_DRIFT_CHECK_INTERVAL_MS - 1 })
		).toBe(false);
		expect(shouldCheckMediaDrift({ force: false, elapsedMs: MEDIA_DRIFT_CHECK_INTERVAL_MS })).toBe(
			true
		);
	});

	it('checks immediately after lifecycle and timeline changes', () => {
		expect(shouldCheckMediaDrift({ force: true, elapsedMs: 0 })).toBe(true);
	});
});

describe('hasPlaybackTimeJumped', () => {
	it('does not treat a delayed playback tick as a seek', () => {
		expect(
			hasPlaybackTimeJumped({
				previousTimeMs: 1000,
				currentTimeMs: 1050,
				observedBefore: true
			})
		).toBe(false);
	});

	it('detects a timeline move larger than ordinary playback steps', () => {
		expect(
			hasPlaybackTimeJumped({
				previousTimeMs: 1000,
				currentTimeMs: 1400,
				observedBefore: true
			})
		).toBe(true);
	});
});
