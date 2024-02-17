<script lang="ts">
	import { currentPlaybackTime, previewPlaying } from '../../../stores/store';
	import IconButton from '$lib/components/shared/IconButton.svelte';
	import PlayIcon from '$lib/assets/preview/play.png';
	import PauseIcon from '$lib/assets/preview/pause.png';
	import SkipStartIcon from '$lib/assets/preview/skip-start.png';
	import SkipEndIcon from '$lib/assets/preview/skip-end.png';
	import FrameBeforeIcon from '$lib/assets/preview/frame-before.png';
	import FrameAfterIcon from '$lib/assets/preview/frame-after.png';
	import { pausePlayback, resumePlayback } from '$lib/utils/utils';

	function onSkipStartClick() {
		console.log('onSkipStartClick clicked!');
		// pause playback to clear current playback interval
		pausePlayback();
		// reset current playback to 0
		currentPlaybackTime.set(0);
	}

	function onFrameBeforeClick() {
		console.log('onFrameBeforeClick clicked!');
	}

	// play/pause current playback
	function onPlayPauseClick() {
		console.log('handlePlayPause clicked!');
		previewPlaying.update((value) => {
			value ? pausePlayback() : resumePlayback();
			return !value;
		});
		// TODO: pause/resume playback
	}

	function onFrameAfterClick() {
		console.log('onFrameAfterClick clicked!');
	}

	function onSkipEndClick() {
		console.log('onSkipEndClick clicked!');
	}
</script>

<div class="preview-controls flex gap-1 justify-center items-center h-full">
	<IconButton onClickCallback={onSkipStartClick} icon={SkipStartIcon} alt={'Skip to start'}
	></IconButton>
	<IconButton onClickCallback={onFrameBeforeClick} icon={FrameBeforeIcon} alt={'Frame Before'}
	></IconButton>
	<IconButton
		onClickCallback={onPlayPauseClick}
		icon={$previewPlaying ? PauseIcon : PlayIcon}
		alt={$previewPlaying ? 'Pause' : 'Play'}
	></IconButton>
	<IconButton onClickCallback={onFrameAfterClick} icon={FrameAfterIcon} alt={'Frame after'}
	></IconButton>
	<IconButton onClickCallback={onSkipEndClick} icon={SkipEndIcon} alt={'Skip to end'}></IconButton>
</div>
