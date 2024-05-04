<script lang="ts">
	import type { ITimelineDraggedElement, ITimelineTrack } from '$lib/interfaces/Timeline';
	import { onMount } from 'svelte';
	import {
		currentTimelineScale,
		draggedElement,
		isTimelineElementBeingDragged,
		thumbOffset,
		timelineTracks
	} from '../../../stores/store';
	import TimelineRowElement from './TimelineRowElement.svelte';
	import { CONSTS } from '$lib/utils/consts';
	import {
		cleanUpEmptyTracks,
		getTailwindVariables,
		handleTimelineMediaDrop
	} from '$lib/utils/utils';
	import colors from 'tailwindcss/colors';
	import type { IMedia } from '$lib/interfaces/Media';

	export let track: ITimelineTrack;
	export let index: number;
	console.log('TimelineRow -> track:', track);

	// call function everytime the store variable changes
	$: isElementHovered($draggedElement);

	// $: elementWidth = (element.duration / CONSTS.secondsMultiplier) * $currentTimelineScale;

	let rowRef: HTMLElement;

	let dropZonePositionLeft = 0;
	let elementHoveredOverRow = false;
	let tracksElBoundRect: DOMRect;
	let elementWidth = 0;
	let hoverElement = false;
	let dropZoneWidth = 0;

	onMount(() => {
		const tracksEl = document.getElementsByClassName('timeline-tracks')[0];
		tracksElBoundRect = tracksEl.getBoundingClientRect();

		// listen to event when a timeline element is dropped
		window.addEventListener(CONSTS.customEventNameDropTimelineElement, () => {
			console.log(
				`${CONSTS.customEventNameDropTimelineElement} event triggered in divider -> elementHoveredOverRow:`,
				elementHoveredOverRow
			);

			if (!elementHoveredOverRow) return;

			if (!$draggedElement) return;

			// TODO: remove track offset to the left and make it into a const to use everywhere
			// get position of dropped element along the x axis
			const xWithoutOffset = $draggedElement.left - 20;
			const x = xWithoutOffset < 20 ? 0 : xWithoutOffset;

			const elementId = $draggedElement.elementId;
			console.log('drop-timeline-element -> dropped element on the x axis:', x);

			// move timeline element to correct position in the row
			// TODO: move other elements if necessary
			timelineTracks.update((tracks) => {
				// find dragged element using the element id
				// let foundEl = undefined;
				// let i = 0;
				// while (!foundEl && i < tracks.length) {
				// 	foundEl = tracks[i].elements.find((el) => el.elementId === elementId);
				// 	i++;
				// }

				// find dragged element index using the element id
				let elementIndexInTrack = -1;
				let trackIndex = 0;
				while (elementIndexInTrack === -1 && trackIndex < tracks.length) {
					console.log(
						'element dropped on track -> in while tracks:',
						JSON.parse(JSON.stringify(tracks)),
						'trackIndex:',
						trackIndex
					);
					elementIndexInTrack = tracks[trackIndex].elements.findIndex(
						(el) => el.elementId === elementId
					);
					if (elementIndexInTrack === -1) {
						trackIndex++;
					}
				}

				console.log(
					'element dropped on track -> after while elementIndexOnTrack:',
					elementIndexInTrack,
					'old trackIndex:',
					trackIndex,
					'new track index:',
					index
				);

				if (elementIndexInTrack === -1) {
					return tracks;
				}

				const foundEl = tracks[trackIndex].elements[elementIndexInTrack];

				console.log(
					'element dropped on track -> after while foundEl:',
					foundEl,
					'trackIndex:',
					trackIndex
				);

				// TODO: check track index of dragged element and if its the same as the current row just change the playback start time, else we also need to remove it from the current row and move it into the new one with the updated playback start time

				// convert the x value from px into ms
				const xInMs = Math.round((x / $currentTimelineScale) * CONSTS.secondsMultiplier) || 0;

				// set the new playback start time (in ms)
				foundEl.playbackStartTime = xInMs;
				console.log(
					'element dropped on track after new playbacktime set -> foundEl:',
					foundEl,
					'x in ms:',
					xInMs
				);

				// if the element is moved to a different track
				if (index !== trackIndex) {
					// remove dragged element from old track
					tracks[trackIndex].elements.splice(elementIndexInTrack, 1);
					console.log(
						'element dropped on track -> tracks after element removed from track:',
						JSON.parse(JSON.stringify(tracks))
					);

					// add element into new track
					tracks[index].elements.push(foundEl);
					console.log(
						'element dropped on track -> tracks after element added to new track:',
						JSON.parse(JSON.stringify(tracks))
					);

					// clean up old track if its empty now
					cleanUpEmptyTracks(tracks);
					console.log(
						'element dropped on divider -> tracks after empty track is removed:',
						JSON.parse(JSON.stringify(tracks))
					);
				}

				return tracks;
			});
		});
	});

	// TODO: refactor to be a util function (including the function in the divider)
	// check if element is currently hovered over row
	function isElementHovered(draggedEl: ITimelineDraggedElement | null) {
		if (!draggedEl) return;

		const boundRect = rowRef.getBoundingClientRect();
		const offsetInParent = {
			left: boundRect.left - tracksElBoundRect.left,
			top: boundRect.top - tracksElBoundRect.top
		};

		// current mouse position on the y axis
		const curYPos = draggedEl.top + draggedEl.clickedY;
		elementHoveredOverRow =
			curYPos >= offsetInParent.top && curYPos <= offsetInParent.top + boundRect.height;
		console.log('isElementHovered -> elementHoveredOverRow:', elementHoveredOverRow);
		// if element is hovered over row show drop zone element
		if (elementHoveredOverRow) {
			// TODO: move the hardcoded value into a const
			// limit the drop zone offset to the left so it doesnt' further left than the track
			dropZonePositionLeft = Math.max(draggedEl.left, 20);

			if (elementWidth === 0) {
				// calculate element width using the dragged element width
				elementWidth = draggedEl.width;
			}
			console.log(
				'isElementHovered -> in if dropZoneLeft:',
				dropZonePositionLeft,
				'elementWidth:',
				elementWidth
			);
		} else {
			elementWidth = 0;
		}
	}

	function onHoverElement(e: DragEvent) {
		console.log('hover media element over row -> e:', e);
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverElement = true;
		// subtract hald the media pool element width so drop zone starts at the left of the element
		dropZonePositionLeft = e.clientX - CONSTS.mediaPoolElementWidth;

		if (dropZoneWidth) {
			return;
		}

		// get data from dropped element
		let mediaDataString = e.dataTransfer?.getData(CONSTS.mediaPoolTransferKey);

		if (!mediaDataString) {
			return;
		}

		// parse it back to be a object again
		const mediaData: IMedia = JSON.parse(mediaDataString);
		const duration = mediaData.duration;
		if (!duration) {
			return;
		}
		dropZoneWidth = Math.round((duration / CONSTS.secondsMultiplier) * $currentTimelineScale);
		// console.log('hover media element over row -> e:', e, 'mediaData:', mediaData);
	}

	function onDropElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverElement = false;

		// get data from dropped element
		let mediaDataString = e.dataTransfer?.getData(CONSTS.mediaPoolTransferKey);

		if (!mediaDataString) {
			return;
		}

		// parse it back to be a object again
		const mediaData: IMedia = JSON.parse(mediaDataString);
		const duration = mediaData.duration;

		if (!duration) {
			return;
		}

		// only handle files when actually dropped
		if (!mediaData || e.type === 'dragleave') {
			return;
		}

		// timelineTracks.update((tracks) => {
		// 	tracks[index].elements.push;

		// 	return tracks;
		// });
		console.log('drop element -> left:', dropZonePositionLeft, dropZonePositionLeft - $thumbOffset);
		const startTimeInPx = dropZonePositionLeft - $thumbOffset;
		const startTimeInMs = (startTimeInPx / $currentTimelineScale) * 1000;
		// TODO: make second index dynamic
		handleTimelineMediaDrop(mediaData, index, 1, startTimeInMs);

		// handleTimelineMediaDrop(mediaData, index);
	}
</script>

<div
	class="timeline-row bg-ruler-color h-[50px] w-full mr-5 rounded flex"
	style="background-color: {hoverElement ? 'red' : '#42424e'}"
	on:drop={onDropElement}
	on:dragleave={onDropElement}
	on:dragenter={onHoverElement}
	on:dragover={onHoverElement}
	bind:this={rowRef}
>
	<!-- <div
		class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed z-10"
		style="width: {elementWidth}px; display: {elementHoveredOverRow &&
		$isTimelineElementBeingDragged
			? 'unset'
			: 'none'}; background-color: green; transform: translate3d({dropZonePositionLeft}px, 0, 0);"
	></div> -->

	<!-- element that is shown when a media pool element is being dragged -->
	<div
		class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed z-10 absolute"
		style="width: {dropZoneWidth}px; display: {hoverElement
			? 'unset'
			: 'none'}; background-color: green; left: {dropZonePositionLeft}px;"
	></div>

	<!-- element that is shown when an timeline element is being dragged -->
	<div
		class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed z-10 absolute"
		style="width: {elementWidth}px; display: {elementHoveredOverRow &&
		$isTimelineElementBeingDragged
			? 'unset'
			: 'none'}; background-color: green; left: {dropZonePositionLeft}px;"
	></div>
	{#each track.elements as element}
		<TimelineRowElement {element}></TimelineRowElement>
	{/each}
</div>
