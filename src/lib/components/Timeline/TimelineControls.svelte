<script lang="ts">
	import {
		currentPlaybackTime,
		currentTimelineScale,
		maxPlaybackTime,
		previewPlaying,
		scaleFitToScreen,
		selectedElement,
		timelineTracks,
		windowWidth
	} from '../../../stores/store';
	import IconButton from '../shared/IconButton.svelte';
	import DeleteIcon from '$lib/assets/timeline/delete.png';
	import IncreaseIcon from '$lib/assets/timeline/increase.png';
	import DecreaseIcon from '$lib/assets/timeline/decrease.png';
	import FitToScaleIcon from '$lib/assets/timeline/fit.png';
	import SplitIcon from '$lib/assets/timeline/split.png';
	import DuplicateIcon from '$lib/assets/timeline/duplicate.png';
	import MoveBackwardIcon from '$lib/assets/timeline/move-backward.svg';
	import MoveForwardIcon from '$lib/assets/timeline/move-forward.svg';
	import { generateId } from '$lib/utils/utils';
	import { CONSTS } from '$lib/utils/consts';
	import {
		doesElementExistInTimeline,
		getIndexOfSelectedElementInTracks,
		getNextHigherScale,
		getNextLowerScale,
		isAnElementSelected,
		isAtMaxTimelineScale,
		isAtMinTimelineScale,
		moveElementToAdjacentRow,
		thumbOverSelectedElement
	} from '$lib/utils/timeline.utils';
	import { msToS, formatPlaybackTime } from '$lib/utils/time.utils';
	import { formatShortcutTooltip } from '$lib/utils/keyboard-shortcuts.utils';
	import {
		deleteSelectedTimelineElement,
		duplicateSelectedTimelineElement,
		splitSelectedTimelineElement
	} from '$lib/utils/timeline-actions.utils';
	import { runTimelineEdit } from '$lib/utils/timeline-history.utils';

	// update controls when different store values change
	$: $selectedElement, updateControls();
	$: $currentPlaybackTime, updateControls();
	$: $previewPlaying, updateControls();
	$: $timelineTracks, updateControls();
	$: $currentTimelineScale, updateControls();

	let disableDelete = false;
	let disableSplit = false;
	let disableScaleIncrease = false;
	let disableScaleDecrease = false;
	let disableLeftButtons = false;
	let disableRightButtons = false;

	function updateControls() {
		const playbackRunning = $previewPlaying;

		// disable the delete button if no element is selected, the playback is running or no element is in timeline
		disableDelete = playbackRunning;
		// disable the split button if the thumb is not over the selected element, the playback is running or no element is in timeline
		disableSplit = thumbOverSelectedElement() === -1 || playbackRunning;
		// disable scale increase when we are already at the max timeline scale
		disableScaleIncrease = isAtMaxTimelineScale();
		// disable scale decrease when we are already at the min timeline scale
		disableScaleDecrease = isAtMinTimelineScale();
		// disable right buttons if no element exists in timeline
		disableRightButtons = !doesElementExistInTimeline();
		// disable left buttons if no element is selected or not elemens exists in timeline
		disableLeftButtons = !isAnElementSelected() || !doesElementExistInTimeline();
	}

	function increaseTimelineScale() {
		if ($scaleFitToScreen) {
			// get the next "normal" scale value higher than the current custom value
			currentTimelineScale.set(getNextHigherScale());
			scaleFitToScreen.set(false);
		} else {
			currentTimelineScale.update((value) => value * 2);
		}
	}

	function decreaseTimelineScale() {
		if ($scaleFitToScreen) {
			// get the next "normal" scale value lower than the current custom value
			currentTimelineScale.set(getNextLowerScale());
			scaleFitToScreen.set(false);
		} else {
			currentTimelineScale.update((value) => value / 2);
		}
	}

	function fitScaleToScreen() {
		const maxPlayback = $maxPlaybackTime;
		const width = $windowWidth;

		// convert the max playback time (+ plus a small buffer to have some space on the right edge) from milliseconds into seconds
		const maxPlaybackInS = Math.ceil(msToS(maxPlayback + 500));

		// calculate the new scale by checking how often the max playback (in seconds) can fit into the current window width
		const newScale = Math.floor(width / maxPlaybackInS);

		currentTimelineScale.set(newScale);
		scaleFitToScreen.set(true);
	}

	// move forward means up and move backward means down in the timeline
	function moveSelectedElementToAdjacentRow(direction: 'up' | 'down') {
		const indices = getIndexOfSelectedElementInTracks();

		if (!indices) {
			return;
		}

		runTimelineEdit(() =>
			timelineTracks.update((tracks) =>
				moveElementToAdjacentRow(tracks, indices, direction, generateId())
			)
		);
	}

</script>

<div class="flex flex-row px-2 py-[6px] timeline-controls items-center">
	<div class="flex-1">
		<div class="flex gap-[6px] items-center">
			<IconButton
				onClickCallback={deleteSelectedTimelineElement}
				icon={DeleteIcon}
				alt={'Delete'}
				tooltipText={formatShortcutTooltip('Delete', 'delete')}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableLeftButtons || disableDelete}
			></IconButton>
			<IconButton
				onClickCallback={splitSelectedTimelineElement}
				icon={SplitIcon}
				alt={'Split'}
				tooltipText={formatShortcutTooltip('Split', 'split')}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableLeftButtons || disableSplit}
			></IconButton>
			<IconButton
				onClickCallback={duplicateSelectedTimelineElement}
				icon={DuplicateIcon}
				alt={'Duplicate'}
				tooltipText={formatShortcutTooltip('Duplicate', 'duplicate')}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableLeftButtons}
			></IconButton>
			<IconButton
				onClickCallback={() => moveSelectedElementToAdjacentRow('up')}
				icon={MoveForwardIcon}
				alt={'Move Forward'}
				tooltipText={'Move Forward'}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableLeftButtons}
			></IconButton>
			<IconButton
				onClickCallback={() => moveSelectedElementToAdjacentRow('down')}
				icon={MoveBackwardIcon}
				alt={'Move Backward'}
				tooltipText={'Move Backward'}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableLeftButtons}
			></IconButton>
		</div>
	</div>
	<div class="flex-1 text-center">
		<div class="flex gap-1 justify-center">
			<div class="font-bold text-[15px]">
				{formatPlaybackTime($currentPlaybackTime)} /
				{formatPlaybackTime($maxPlaybackTime)}
			</div>
		</div>
	</div>
	<div class="flex-1 text-right">
		<div class="flex justify-end gap-[6px] mr-3 text-lg items-center">
			<IconButton
				onClickCallback={decreaseTimelineScale}
				icon={DecreaseIcon}
				alt={'Zoom Out'}
				tooltipText={'Zoom Out'}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableRightButtons || disableScaleDecrease}
			></IconButton>
			<IconButton
				onClickCallback={increaseTimelineScale}
				icon={IncreaseIcon}
				alt={'Zoom In'}
				tooltipText={'Zoom In'}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableRightButtons || disableScaleIncrease}
			></IconButton>
			<IconButton
				onClickCallback={fitScaleToScreen}
				icon={FitToScaleIcon}
				alt={'Fit To Screen'}
				tooltipText={'Fit To Screen'}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableRightButtons}
			></IconButton>
		</div>
	</div>
</div>
