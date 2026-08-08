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
	import { CONSTS } from '$lib/utils/consts';
	import { formatShortcutTooltip } from '$lib/utils/keyboard-shortcuts.utils';
	import { skipPlayhead, stepPlayhead, togglePlayback } from '$lib/utils/timeline-actions.utils';

	$: disableButtons = $timelineTracks.length === 0;
	$: disableForwardButtons = $currentPlaybackTime >= $maxPlaybackTime;
	$: disableBackwardButtons = $currentPlaybackTime <= 0;

	function onSkipStartClick() {
		skipPlayhead('start');
	}

	function onFrameBeforeClick() {
		stepPlayhead('backward');
	}

	// play/pause current playback
	function onPlayPauseClick() {
		togglePlayback();
	}

	function onFrameAfterClick() {
		stepPlayhead('forward');
	}

	function onSkipEndClick() {
		skipPlayhead('end');
	}
</script>

<div class="preview-controls flex gap-1 justify-center items-center h-full">
	<IconButton
		onClickCallback={onSkipStartClick}
		icon={SkipStartIcon}
		alt={'Skip To Start'}
		tooltipText={formatShortcutTooltip('Skip To Start', 'skip-start')}
		size={CONSTS.previewControlButtonSize}
		disabled={disableButtons || disableBackwardButtons}
	></IconButton>
	<IconButton
		onClickCallback={onFrameBeforeClick}
		icon={FrameBeforeIcon}
		alt={'Frame Before'}
		tooltipText={formatShortcutTooltip('Frame Before', 'step-backward')}
		size={CONSTS.previewControlButtonSize}
		disabled={disableButtons || disableBackwardButtons}
	></IconButton>
	<IconButton
		onClickCallback={onPlayPauseClick}
		icon={$previewPlaying ? PauseIcon : PlayIcon}
		alt={$previewPlaying ? 'Pause' : 'Play'}
		tooltipText={formatShortcutTooltip($previewPlaying ? 'Pause' : 'Play', 'toggle-playback')}
		size={CONSTS.previewControlButtonSize}
		disabled={disableButtons || disableForwardButtons}
	></IconButton>
	<IconButton
		onClickCallback={onFrameAfterClick}
		icon={FrameAfterIcon}
		alt={'Frame After'}
		tooltipText={formatShortcutTooltip('Frame After', 'step-forward')}
		size={CONSTS.previewControlButtonSize}
		disabled={disableButtons || disableForwardButtons}
	></IconButton>
	<IconButton
		onClickCallback={onSkipEndClick}
		icon={SkipEndIcon}
		alt={'Skip To End'}
		tooltipText={formatShortcutTooltip('Skip To End', 'skip-end')}
		size={CONSTS.previewControlButtonSize}
		disabled={disableButtons || disableForwardButtons}
	></IconButton>
</div>
