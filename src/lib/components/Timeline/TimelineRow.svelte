<script lang="ts">
	import type {
		ITimelineDraggedElementPosition,
		ITimelineElementBounds,
		ITimelineTrack
	} from '$lib/interfaces/Timeline';
	import { onMount } from 'svelte';
	import {
		currentTimelineScale,
		draggedElementData,
		draggedElementPosition,
		isTimelineElementBeingDragged,
		thumbOffset,
		timelineTracks
	} from '../../../stores/store';
	import TimelineRowElement from './TimelineRowElement.svelte';
	import { CONSTS } from '$lib/utils/consts';
	import {
		cleanUpEmptyTracks,
		convertMsToPx,
		convertPxToMs,
		handleTimelineMediaDrop,
		isElementOverlapping,
		moveElementsOnTrack
	} from '$lib/utils/utils';
	import type { IMedia } from '$lib/interfaces/Media';

	export let track: ITimelineTrack;
	export let index: number;
	console.log('TimelineRow -> track:', track);

	// check if the dragged element is hovered over current row
	$: isElementHovered($draggedElementPosition);

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
				`${CONSTS.customEventNameDropTimelineElement} event triggered in row -> elementHoveredOverRow:`,
				elementHoveredOverRow
			);

			if (!$draggedElementData || !$draggedElementPosition || !elementHoveredOverRow) return;

			// get position of dropped element along the x axis
			const xWithoutOffset = $draggedElementPosition.left - CONSTS.timelineRowOffset;
			const x = xWithoutOffset < CONSTS.timelineRowOffset ? 0 : xWithoutOffset;
			const elementId = $draggedElementData.elementId;

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

				// find previous index of dragged element in previous track using the element id
				let elementIndexInTrack = -1;
				// keep track of the previous track index of the dragged element
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
					index,
					'tracks:',
					tracks
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
				const xInMs = convertPxToMs(x);
				const foundElEnd = xInMs + foundEl.duration;
				const elBounds: ITimelineElementBounds = { start: xInMs, end: foundElEnd };
				const sameTrackMoveElIndex = index !== trackIndex ? undefined : elementIndexInTrack;

				// check if the dropped element overlaps with any element on the track
				const isOverlapping = isElementOverlapping(
					elBounds,
					tracks[index].elements,
					sameTrackMoveElIndex // if the element is dropped on the same track we ignore the dragged element index in the track
				);

				// if the dropped element overlaps any other element we move the elements accordingly so the element can fit on the track
				if (isOverlapping) {
					tracks[index].elements = moveElementsOnTrack(
						elBounds,
						tracks[index].elements,
						sameTrackMoveElIndex
					);
				}

				// set the new playback start time (in ms)
				foundEl.playbackStartTime = xInMs;
				console.log(
					'element dropped on track after new playbacktime set -> foundEl:',
					foundEl,
					'x in ms:',
					xInMs,
					'isOverlapping:',
					isOverlapping,
					'elementIndexInTrack:',
					elementIndexInTrack
				);

				// if the element is moved to a different track
				if (index !== trackIndex) {
					// remove dragged element from old track
					tracks[trackIndex].elements.splice(elementIndexInTrack, 1);
					console.log(
						'element dropped on track -> tracks after element removed from track:',
						JSON.parse(JSON.stringify(tracks))
					);

					console.log(
						'element dropped on track -> tracks checking if overlapping:',
						isOverlapping,
						'xInMs',
						xInMs,
						'foundEl:',
						foundEl,
						'new track:',
						JSON.parse(JSON.stringify(tracks[index]))
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
						'element dropped on track -> tracks after empty track is removed:',
						JSON.parse(JSON.stringify(tracks))
					);
				}
				// if the element is dropped on the same track
				// TODO: remove if not necessary anymore
				else {
				}

				return tracks;
			});
		});
	});

	// TODO: refactor to be a util function (including the function in the divider)
	// check if element is currently hovered over row
	function isElementHovered(draggedEl: ITimelineDraggedElementPosition | null) {
		if (!draggedEl || !$draggedElementData || !rowRef) return;

		const boundRect = rowRef.getBoundingClientRect();
		const offsetInParent = {
			left: boundRect.left - tracksElBoundRect.left,
			top: boundRect.top - tracksElBoundRect.top
		};

		// current mouse position on the y axis
		const curYPos = draggedEl.clickedY;
		elementHoveredOverRow =
			curYPos >= offsetInParent.top && curYPos <= offsetInParent.top + boundRect.height;
		console.log(
			'isElementHovered -> elementHoveredOverRow:',
			elementHoveredOverRow,
			'isTimelineElementBeingDragged',
			$isTimelineElementBeingDragged,
			'draggedEl:',
			draggedEl,
			'offsetInParent:',
			offsetInParent
		);
		// if element is hovered over row show drop zone element
		if (elementHoveredOverRow) {
			// TODO: move the hardcoded value into a const
			// limit the drop zone offset to the left so it doesnt' further left than the track
			dropZonePositionLeft = Math.max(draggedEl.left, CONSTS.timelineRowOffset);

			if (elementWidth === 0) {
				// calculate element width using the dragged element width
				elementWidth = $draggedElementData.width;
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
		dropZonePositionLeft = Math.max(
			e.clientX - CONSTS.mediaPoolElementWidth,
			CONSTS.timelineRowOffset
		);

		if (dropZoneWidth) {
			return;
		}

		// get data from dropped element
		let mediaDataString = e.dataTransfer?.getData(CONSTS.mediaPoolTransferKey);

		if (!mediaDataString) {
			return;
		}

		// parse it back to be an object again
		const mediaData: IMedia = JSON.parse(mediaDataString);

		// set a default duration for media elements such as images that don't have a duration
		const duration = mediaData.duration || 3000;

		if (!duration) {
			return;
		}

		dropZoneWidth = convertMsToPx(duration);
	}

	function onDropElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverElement = false;

		// reset so the width of the next hovered element is calculated new again
		dropZoneWidth = 0;

		// get data from dropped element
		let mediaDataString = e.dataTransfer?.getData(CONSTS.mediaPoolTransferKey);

		if (!mediaDataString) {
			return;
		}

		// parse it back to be an object again
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
	data-row-index={index}
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
	{#each track.elements as element, elementIndex}
		<TimelineRowElement {element} {elementIndex} rowIndex={index}></TimelineRowElement>
	{/each}
</div>
