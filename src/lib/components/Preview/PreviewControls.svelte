<script lang="ts">
	import { previewPlaying } from '../../../stores/store';
	import PreviewControlsButton from '$lib/components/Preview/PreviewControlsButton.svelte';
	import PlayIcon from '$lib/assets/preview/play.png';
	import PauseIcon from '$lib/assets/preview/pause.png';
	import SkipStartIcon from '$lib/assets/preview/skip-start.png';
	import SkipEndIcon from '$lib/assets/preview/skip-end.png';
	import FrameBeforeIcon from '$lib/assets/preview/frame-before.png';
	import FrameAfterIcon from '$lib/assets/preview/frame-after.png';

	function onSkipStartClick() {
		console.log('onSkipStartClick clicked!');
	}

	function onFrameBeforeClick() {
		console.log('onFrameBeforeClick clicked!');
	}

	function onPlayPauseClick() {
		console.log('handlePlayPause clicked!');
		previewPlaying.update((value) => !value);
	}

	function onFrameAfterClick() {
		console.log('onFrameAfterClick clicked!');
	}

	function onSkipEndClick() {
		console.log('onSkipEndClick clicked!');
	}
</script>

<div class="preview-controls flex gap-2 justify-center items-center h-full">
	<PreviewControlsButton
		onClickCallback={onSkipStartClick}
		icon={SkipStartIcon}
		alt={'Skip to start'}
	></PreviewControlsButton>
	<PreviewControlsButton
		onClickCallback={onFrameBeforeClick}
		icon={FrameBeforeIcon}
		alt={'Frame Before'}
	></PreviewControlsButton>
	<PreviewControlsButton
		onClickCallback={onPlayPauseClick}
		icon={$previewPlaying ? PauseIcon : PlayIcon}
		alt={$previewPlaying ? 'Pause' : 'Play'}
	></PreviewControlsButton>
	<PreviewControlsButton
		onClickCallback={onFrameAfterClick}
		icon={FrameAfterIcon}
		alt={'Frame after'}
	></PreviewControlsButton>
	<PreviewControlsButton onClickCallback={onSkipEndClick} icon={SkipEndIcon} alt={'Skip to end'}
	></PreviewControlsButton>
</div>
