export const MEDIA_DRIFT_THRESHOLD_SECONDS = 0.2;
export const MEDIA_CORRECTION_COOLDOWN_MS = 500;
export const MEDIA_DRIFT_CHECK_INTERVAL_MS = 250;
export const MEDIA_SYNC_INTERVAL_MS = 50;
export const PLAYBACK_TIME_JUMP_TOLERANCE_MS = 100;

export interface IMediaSyncInput {
	active: boolean;
	playing: boolean;
	paused: boolean;
	seeking: boolean;
	playPending: boolean;
	driftSeconds: number;
	checkDrift: boolean;
	forceSeek: boolean;
	timeSinceCorrectionMs: number;
}

export interface IMediaSyncActions {
	pause: boolean;
	seek: boolean;
	play: boolean;
}

export interface IMediaSyncScheduleInput {
	playing: boolean;
	playbackChanged: boolean;
	managedSetChanged: boolean;
	timeJumped: boolean;
	elapsedMs: number;
}

export interface IPlaybackTimeJumpInput {
	previousTimeMs: number;
	currentTimeMs: number;
	observedBefore: boolean;
}

export interface IMediaDriftScheduleInput {
	force: boolean;
	elapsedMs: number;
}

export function getMediaSyncActions(input: IMediaSyncInput): IMediaSyncActions {
	if (!input.active) {
		return { pause: !input.paused, seek: false, play: false };
	}

	if (!input.playing) {
		return { pause: !input.paused, seek: true, play: false };
	}

	// an in-flight seek must settle before another correction can replace it
	const driftCorrectionReady =
		input.checkDrift &&
		input.driftSeconds > MEDIA_DRIFT_THRESHOLD_SECONDS &&
		input.timeSinceCorrectionMs >= MEDIA_CORRECTION_COOLDOWN_MS;
	const seek = !input.seeking && (input.forceSeek || driftCorrectionReady);

	return {
		pause: false,
		seek,
		play: input.paused && !input.playPending
	};
}

export function shouldCheckMediaDrift(input: IMediaDriftScheduleInput): boolean {
	return input.force || input.elapsedMs >= MEDIA_DRIFT_CHECK_INTERVAL_MS;
}

export function shouldRunMediaSync(input: IMediaSyncScheduleInput): boolean {
	return (
		!input.playing ||
		input.playbackChanged ||
		input.managedSetChanged ||
		input.timeJumped ||
		input.elapsedMs >= MEDIA_SYNC_INTERVAL_MS
	);
}

export function hasPlaybackTimeJumped(input: IPlaybackTimeJumpInput): boolean {
	return (
		input.observedBefore &&
		Math.abs(input.currentTimeMs - input.previousTimeMs) > PLAYBACK_TIME_JUMP_TOLERANCE_MS
	);
}
