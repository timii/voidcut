<script lang="ts">
	import {
		currentPlaybackTime,
		maxPlaybackTime,
		previewPlaying,
		timelineTracks
	} from '../../../stores/store';
	import IconButton from '$lib/components/shared/IconButton.svelte';
	import PlayIcon from '$lib/assets/preview/play.png';
	import PauseIcon from '$lib/assets/preview/pause.png';
	import SkipStartIcon from '$lib/assets/preview/skip-start.png';
	import SkipEndIcon from '$lib/assets/preview/skip-end.png';
	import FrameBeforeIcon from '$lib/assets/preview/frame-before.png';
	import FrameAfterIcon from '$lib/assets/preview/frame-after.png';
	import { doesElementExistInTimeline, pausePlayback, resumePlayback } from '$lib/utils/utils';
	import { CONSTS } from '$lib/utils/consts';

	$: $timelineTracks, updateControls();
	$: $currentPlaybackTime, updateControls();

	let disableButtons = false;
	let disableForwardButtons = false;
	let disableBackwardButtons = false;

	function updateControls() {
		// disable controls if no element exists in the timeline
		disableButtons = !doesElementExistInTimeline();

		// disable the "forward" buttons if we are the max play back time
		disableForwardButtons = $currentPlaybackTime === $maxPlaybackTime;

		// disable the "backward buttons if we are the start of the timeline
		disableBackwardButtons = $currentPlaybackTime === 0;
	}

	function onSkipStartClick() {
		console.log('onSkipStartClick clicked!');
		// pause playback to clear current playback interval
		pausePlayback();
		// reset current playback to 0
		currentPlaybackTime.set(0);
	}

	function onFrameBeforeClick() {
		console.log('onFrameBeforeClick clicked!');
		// pause playback to clear current playback interval
		pausePlayback();
		// decrease current playback time by one interval timeout
		currentPlaybackTime.update((currentTime) => currentTime - CONSTS.playbackIntervalTimer);
	}

	// play/pause current playback
	function onPlayPauseClick() {
		console.log('handlePlayPause clicked!');
		previewPlaying.update((value) => {
			value ? pausePlayback() : resumePlayback();
			return !value;
		});
	}

	function onFrameAfterClick() {
		console.log('onFrameAfterClick clicked!');
		// pause playback to clear current playback interval
		pausePlayback();
		// increase current playback time by one interval timeout
		currentPlaybackTime.update((currentTime) => currentTime + CONSTS.playbackIntervalTimer);
	}

	function onSkipEndClick() {
		console.log('onSkipEndClick clicked!');
		// pause playback to clear current playback interval
		pausePlayback();
		// set current playback to max playback time
		currentPlaybackTime.set($maxPlaybackTime);
	}
</script>

<div class="preview-controls flex gap-1 justify-center items-center h-full">
	<IconButton
		onClickCallback={onSkipStartClick}
		icon={SkipStartIcon}
		alt={'Skip to start'}
		disabled={disableButtons || disableBackwardButtons}
	></IconButton>
	<IconButton
		onClickCallback={onFrameBeforeClick}
		icon={FrameBeforeIcon}
		alt={'Frame Before'}
		disabled={disableButtons || disableBackwardButtons}
	></IconButton>
	<IconButton
		onClickCallback={onPlayPauseClick}
		icon={$previewPlaying ? PauseIcon : PlayIcon}
		alt={$previewPlaying ? 'Pause' : 'Play'}
		disabled={disableButtons || disableForwardButtons}
	></IconButton>
	<IconButton
		onClickCallback={onFrameAfterClick}
		icon={FrameAfterIcon}
		alt={'Frame after'}
		disabled={disableButtons || disableForwardButtons}
	></IconButton>
	<IconButton
		onClickCallback={onSkipEndClick}
		icon={SkipEndIcon}
		alt={'Skip to end'}
		disabled={disableButtons || disableForwardButtons}
	></IconButton>
</div>
