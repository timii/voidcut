<script lang="ts">
	import {
		currentPlaybackTime,
		currentTimelineScale,
		previewPlaying,
		selectedElement,
		timelineTracks
	} from '../../../stores/store';
	import IconButton from '../shared/IconButton.svelte';
	import DeleteIcon from '$lib/assets/timeline/delete.png';
	import IncreaseIcon from '$lib/assets/timeline/increase.png';
	import DecreaseIcon from '$lib/assets/timeline/decrease.png';
	import SplitIcon from '$lib/assets/timeline/split.png';
	import {
		doesElementExistInTimeline,
		elementIsAnImage,
		formatPlaybackTime,
		generateId,
		getIndexOfSelectedElementInTracks,
		isAnElementSelected,
		thumbOverSelectedElement
	} from '$lib/utils/utils';
	import { CONSTS } from '$lib/utils/consts';
	import type { ITimelineElement } from '$lib/interfaces/Timeline';

	// update controls when different store values change
	$: $selectedElement, updateControls();
	$: $currentPlaybackTime, updateControls();
	$: $previewPlaying, updateControls();
	$: $timelineTracks, updateControls();

	let disableDelete = false;
	let disableSplit = false;
	let disableRightButtons = false;

	function updateControls() {
		// console.log('updateControls called');

		const playbackRunning = $previewPlaying;

		// disable the delete button if no element is selected, the playback is running or no element is in timeline
		disableDelete = !isAnElementSelected() || playbackRunning || !doesElementExistInTimeline();
		// disable the split button if the thumb is not over the selected element, the playback is running or no element is in timeline
		disableSplit =
			thumbOverSelectedElement() === -1 || playbackRunning || !doesElementExistInTimeline();
		// disable right buttons if no element exists in timeline
		disableRightButtons = !doesElementExistInTimeline();

		// console.log(
		// 	'updateControls -> is an element selected',
		// 	isAnElementSelected(),
		// 	'thumbOverSelectedElement',
		// 	thumbOverSelectedElement()
		// );
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
		// get the time where the thumb is over the element
		const timeOverElement = thumbOverSelectedElement();
		console.log('splitSelectedElement called -> timeOverElement:', timeOverElement);

		// get index of row and element in the tracks
		const indeces = getIndexOfSelectedElementInTracks();

		if (!indeces) {
			return;
		}

		timelineTracks.update((tracks) => {
			const element = tracks[indeces.rowIndex].elements[indeces.elementIndex];
			// create a duplicate element but with new element id
			const newElement: ITimelineElement = { ...element, elementId: generateId() };

			// console.log('splitSelectedElement before new element added:', [
			// 	...tracks[indeces.rowIndex].elements
			// ]);

			// put duplicate element directly after the old one
			tracks[indeces.rowIndex].elements.splice(indeces.elementIndex + 1, 0, newElement);

			// console.log('splitSelectedElement after element added:', [
			// 	...tracks[indeces.rowIndex].elements
			// ]);

			let newTrimFromStart = element.trimFromStart;
			let newTrimFromEnd = element.trimFromEnd;

			// don't update the trim from start or end for images, since its always 0
			if (!elementIsAnImage(element)) {
				newTrimFromStart = element.trimFromStart + timeOverElement;
				newTrimFromEnd = element.trimFromEnd + (element.duration - timeOverElement);
			}

			// update the original element
			tracks[indeces.rowIndex].elements[indeces.elementIndex] = {
				...element,
				duration: timeOverElement, // new duration is the point where the element was split
				trimFromEnd: newTrimFromEnd // new trim from end is everything to the right of split position including the previous trim on the right
			};

			// console.log('splitSelectedElement after original element updated:', [
			// 	...tracks[indeces.rowIndex].elements
			// ]);

			// update the new element
			tracks[indeces.rowIndex].elements[indeces.elementIndex + 1] = {
				...newElement,
				duration: element.duration - timeOverElement, // duration for new element is everything to the right side of the split position
				playbackStartTime: element.playbackStartTime + timeOverElement, // playback start time is at the same time as the original element including everythinh up to the split point
				trimFromStart: newTrimFromStart // include original leftTrim to new one
			};

			// console.log('splitSelectedElement after new element updated:', [
			// 	...tracks[indeces.rowIndex].elements
			// ]);

			return tracks;
		});
	}

	function deleteSelectedElement() {
		console.log(
			'deleteSelectedElement clicked -> selectedElement:',
			$selectedElement,
			'timelineTracks:',
			$timelineTracks
		);
		const indeces = getIndexOfSelectedElementInTracks();

		// if we couldn't find the indeces of the selected element we return directly
		if (!indeces) {
			return;
		}

		console.log('deleteSelectedElement -> indeces found:', indeces);
		const firstIndex = indeces.rowIndex;
		const secondIndex = indeces.elementIndex;
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
				size={CONSTS.timelineControlButtonSize}
				disabled={disableDelete}
			></IconButton>
			<IconButton
				onClickCallback={splitSelectedElement}
				icon={SplitIcon}
				alt={'Split selected element'}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableSplit}
			></IconButton>
		</div>
	</div>
	<div class="flex-1 text-center">
		<div class="flex gap-1 justify-center">
			<div class="font-bold">
				{formatPlaybackTime($currentPlaybackTime)}
			</div>
		</div>
	</div>
	<div class="flex-1 text-right">
		<div class="flex justify-end gap-1 mr-3 text-lg">
			<IconButton
				onClickCallback={increaseTimelineScale}
				icon={IncreaseIcon}
				alt={'Increase timeline scale'}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableRightButtons}
			></IconButton><IconButton
				onClickCallback={decreaseTimelineScale}
				icon={DecreaseIcon}
				alt={'Decrease timeline scale'}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableRightButtons}
			></IconButton>
		</div>
	</div>
</div>
