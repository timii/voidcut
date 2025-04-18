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
	import { elementIsAnImage, formatPlaybackTime, generateId, msToS } from '$lib/utils/utils';
	import { CONSTS } from '$lib/utils/consts';
	import type { ITimelineElement } from '$lib/interfaces/Timeline';
	import {
		addElementToTimeline,
		doesElementExistInTimeline,
		getIndexOfSelectedElementInTracks,
		getNextHigherScale,
		getNextLowerScale,
		getNextRightElementStartTime,
		isAnElementSelected,
		isAtMaxTimelineScale,
		isAtMinTimelineScale,
		thumbOverSelectedElement
	} from '$lib/utils/timeline.utils';

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

	function splitSelectedElement() {
		// get the time where the thumb is over the element
		const timeOverElement = thumbOverSelectedElement();

		// get index of row and element in the tracks
		const indeces = getIndexOfSelectedElementInTracks();

		if (!indeces) {
			return;
		}

		timelineTracks.update((tracks) => {
			const element = tracks[indeces.rowIndex].elements[indeces.elementIndex];
			// create a duplicate element but with new element id
			const newElement: ITimelineElement = { ...element, elementId: generateId() };

			// put duplicate element directly after the old one
			tracks[indeces.rowIndex].elements.splice(indeces.elementIndex + 1, 0, newElement);

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

			// update the new element
			tracks[indeces.rowIndex].elements[indeces.elementIndex + 1] = {
				...newElement,
				duration: element.duration - timeOverElement, // duration for new element is everything to the right side of the split position
				playbackStartTime: element.playbackStartTime + timeOverElement, // playback start time is at the same time as the original element including everythinh up to the split point
				trimFromStart: newTrimFromStart // include original leftTrim to new one
			};

			return tracks;
		});
	}

	function duplicateSelectedElement() {
		// get index of row and element in the tracks
		const indeces = getIndexOfSelectedElementInTracks();

		if (!indeces) {
			return;
		}

		timelineTracks.update((tracks) => {
			const curRow = tracks[indeces.rowIndex].elements;
			const element = curRow[indeces.elementIndex];
			// create a duplicate element but with new element id
			const newElement: ITimelineElement = { ...element, elementId: generateId() };

			// decide where after the original element the duplicate element fits in the row
			// go through the row, starting from the original element index
			for (let i = indeces.elementIndex; i < curRow.length; i++) {
				// check if an element exists to the right
				const rightElementStart = getNextRightElementStartTime(indeces.rowIndex, i);

				// get the time where current element ends
				const curElementEnd = curRow[i].playbackStartTime + curRow[i].duration;

				// no element exists to the right
				if (rightElementStart === undefined) {
					// add element directly after current element and update its playback start time accordingly
					tracks[indeces.rowIndex].elements = addElementToTimeline(
						curRow,
						i + 1,
						newElement,
						curElementEnd
					);
					break;
				}

				// how big is the gap to the next element
				const gapToNextElement = rightElementStart - curElementEnd;

				// gap is bigger than the new element duration
				if (gapToNextElement > newElement.duration) {
					// add element directly after current element and update its playback start time accordingly
					tracks[indeces.rowIndex].elements = addElementToTimeline(
						curRow,
						i + 1,
						newElement,
						curElementEnd
					);
					break;
				}
			}

			return tracks;
		});
	}

	function deleteSelectedElement() {
		const indeces = getIndexOfSelectedElementInTracks();

		// if we couldn't find the indeces of the selected element we return directly
		if (!indeces) {
			return;
		}

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

<div class="flex flex-row px-2 py-[6px] timeline-controls items-center">
	<div class="flex-1">
		<div class="flex gap-[6px] items-center">
			<IconButton
				onClickCallback={deleteSelectedElement}
				icon={DeleteIcon}
				alt={'Delete'}
				tooltipText={'Delete'}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableLeftButtons || disableDelete}
			></IconButton>
			<IconButton
				onClickCallback={splitSelectedElement}
				icon={SplitIcon}
				alt={'Split'}
				tooltipText={'Split'}
				size={CONSTS.timelineControlButtonSize}
				disabled={disableLeftButtons || disableSplit}
			></IconButton>
			<IconButton
				onClickCallback={duplicateSelectedElement}
				icon={DuplicateIcon}
				alt={'Duplicate'}
				tooltipText={'Duplicate'}
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
