<script lang="ts">
	import {
		currentPlaybackTime,
		currentTimelineScale,
		selectedElement,
		timelineTracks
	} from '../../../stores/store';
	import IconButton from '../shared/IconButton.svelte';
	import DeleteIcon from '$lib/assets/timeline/delete.png';
	import IncreaseIcon from '$lib/assets/timeline/increase.png';
	import DecreaseIcon from '$lib/assets/timeline/decrease.png';
	import SplitIcon from '$lib/assets/timeline/split.png';
	import {
		formatPlaybackTime,
		getIndexOfSelectedElementInTracks,
		isAnElementSelected,
		isThumbOverSelectedElement
	} from '$lib/utils/utils';
	import { CONSTS } from '$lib/utils/consts';

	// update controls every time the selected element or the thumb position changed changes
	$: $selectedElement, updateControls();
	$: $currentPlaybackTime, updateControls();

	let disableDelete = false;
	let disableSplit = false;

	function updateControls() {
		console.log('updateControls called');

		// disable the delete button if no element is selected
		disableDelete = !isAnElementSelected();

		// disable the split button if the thumb is not over the selected element
		disableSplit = !isThumbOverSelectedElement();
	}

	function increaseTimelineScale() {
		currentTimelineScale.update((value) => value * 2);
		console.log('increaseTimelineScale -> currentTimelineScale:', $currentTimelineScale);
	}

	function decreaseTimelineScale() {
		currentTimelineScale.update((value) => value / 2);
		console.log(
			'increaseTimeldecreaseTimelineScaleineScale -> currentTimelineScale:',
			$currentTimelineScale
		);
	}

	function splitSelectedElement() {
		console.log('splitSelectedElement called');
	}

	function deleteSelectedElement() {
		console.log(
			'deleteSelectedElement clicked -> selectedElement:',
			$selectedElement,
			'timelineTracks:',
			$timelineTracks
		);
		const indeces = getIndexOfSelectedElementInTracks();

		// if we couldn't find the index of the selected element we return directly
		if (!indeces) {
			return;
		}

		console.log('deleteSelectedElement -> indeces found:', indeces);
		const firstIndex = indeces[0];
		const secondIndex = indeces[1];
		timelineTracks.update((tracks) => {
			// if there is only one element on the track, remove the whole track
			if (tracks[firstIndex].elements.length === 1) {
				return tracks.toSpliced(firstIndex, 1);
			}
			// else remove the specific element from the elements on the track
			else {
				const trackAfterRemoval = tracks[firstIndex].elements.toSpliced(secondIndex, 1);
				tracks[firstIndex].elements = trackAfterRemoval;
				return tracks;
			}
		});

		// reset the selected element id so no timeline element is selected after deletion
		selectedElement.set({ mediaType: undefined, elementId: '' });
	}
</script>

<div class="flex flex-row p-1 border timeline-controls items-center">
	<div class="flex-1">
		<div class="flex gap-1 ml-3">
			<IconButton
				onClickCallback={deleteSelectedElement}
				icon={DeleteIcon}
				alt={'Delete selected element'}
				size={CONSTS.timelineControlsSize}
				disabled={disableDelete}
			></IconButton>
			<IconButton
				onClickCallback={splitSelectedElement}
				icon={SplitIcon}
				alt={'Split selected element'}
				size={CONSTS.timelineControlsSize}
				disabled={disableSplit}
			></IconButton>
		</div>
	</div>
	<div class="flex-1 text-center font-bold">{formatPlaybackTime($currentPlaybackTime)}</div>
	<div class="flex-1 text-right">
		<div class="flex justify-end gap-1 mr-3 text-lg">
			<IconButton
				onClickCallback={increaseTimelineScale}
				icon={IncreaseIcon}
				alt={'Increase timeline scale'}
				size={CONSTS.timelineControlsSize}
			></IconButton><IconButton
				onClickCallback={decreaseTimelineScale}
				icon={DecreaseIcon}
				alt={'Decrease timeline scale'}
				size={CONSTS.timelineControlsSize}
			></IconButton>
		</div>
	</div>
</div>
