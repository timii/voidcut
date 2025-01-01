<script lang="ts">
	import {
		TimelineDropArea,
		type ITimelineDraggedElementPosition,
		type ITimelineElementBounds,
		type ITimelineTrack
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
		handleElementIndeces,
		handleOverlapping,
		handleTimelineMediaDrop
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

			// if no data for the dragged element is defined or no element is hovered over the row we just return
			if (!$draggedElementData || !$draggedElementPosition || !elementHoveredOverRow) return;

			const draggedData = $draggedElementData;
			const draggedPosition = $draggedElementPosition;

			// get position of dropped element along the x axis
			const xWithoutOffset = draggedPosition.left - CONSTS.timelineRowOffset;
			const x = xWithoutOffset < CONSTS.timelineRowOffset ? 0 : xWithoutOffset;
			const elementEnd = x + draggedData.width;

			// convert the dragged element bounds from px into ms
			const elBoundsInMs: ITimelineElementBounds = {
				start: convertPxToMs(x),
				end: convertPxToMs(elementEnd)
			};

			console.log(
				'Timeline -> row drop-timeline-element -> dropped element on the x axis:',
				x,
				'elementEnd:',
				elementEnd,
				'elBoundsInMs:',
				elBoundsInMs
			);

			// update the current tracks in the store with the newly moved element
			timelineTracks.update((tracks) => {
				// get the previous track and element index of dragged element
				const prevTrackIndex = draggedData.prevTrackIndex;
				const prevElementIndex = draggedData.prevElementIndex;

				console.log(
					'Timeline -> element dropped on track -> after while old element index:',
					prevElementIndex,
					'old trackIndex:',
					prevTrackIndex,
					'new track index:',
					index,
					'tracks:',
					tracks
				);

				// get the dragged element from the previous track
				const foundEl = tracks[prevTrackIndex].elements[prevElementIndex];

				// TODO: just for logging out element without the long dataUrl, can be removed after testing
				const copy: any = Object.assign({}, foundEl);
				delete copy.mediaImage;

				console.log(
					'Timeline -> element dropped on track -> after while foundEl:',
					copy,
					'trackIndex:',
					prevTrackIndex,
					'moved in the same track:',
					draggedData.prevTrackIndex === index
				);
				// element was moved in the same track
				if (draggedData.prevTrackIndex === index) {
					// check and handle if any elements overlap after moving and update the track elements if necessary
					tracks[index].elements = handleOverlapping(
						elBoundsInMs,
						tracks[index].elements,
						prevElementIndex // we ignore the index of the dragged element so we don't check if the element overlaps with itself
					);

					// check and handle if the element with the updated start time is still at the correct index and if not update the track element
					tracks[index].elements = handleElementIndeces(
						foundEl,
						elBoundsInMs.start,
						tracks[index].elements,
						prevElementIndex
					);
				}
				// element was dragged onto a different track
				else {
					// remove dragged element from old track
					tracks[prevTrackIndex].elements.splice(prevElementIndex, 1);
					console.log(
						'Timeline -> element dropped on track -> tracks after element removed from track:',
						JSON.parse(JSON.stringify(tracks))
					);

					// check and handle if any elements overlap after moving and update the track elements if necessary
					tracks[index].elements = handleOverlapping(
						elBoundsInMs,
						tracks[index].elements,
						undefined // we also set this to be undefined since the element was dragged from a different track
					);

					// check and handle if the element with the updated start time is still at the correct index and if not update the track elements
					tracks[index].elements = handleElementIndeces(
						foundEl,
						elBoundsInMs.start,
						tracks[index].elements,
						tracks[index].elements.length, // we use the current length here and not length - 1 since we will add the element inside the function and then the length will be increased by one and we want the index of the last element
						true
					);

					// clean up old track if its empty now
					cleanUpEmptyTracks(tracks);
					console.log(
						'Timeline -> element dropped on track -> tracks after empty track is removed:',
						JSON.parse(JSON.stringify(tracks))
					);
				}

				console.log(
					'Timeline -> row drop-timeline-element -> just before returning tracks -> tracks:',
					[...tracks]
				);
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

		// subtract the media pool element width so drop zone starts at the left of the element
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
		console.log('drop element -> mediaData:', mediaData);

		// only handle files when actually dropped
		if (!mediaData || e.type === 'dragleave') {
			return;
		}

		// timelineTracks.update((tracks) => {
		// 	tracks[index].elements.push;

		// 	return tracks;
		// });
		console.log('drop element -> left:', dropZonePositionLeft, dropZonePositionLeft - $thumbOffset);

		// get the left offset where the element was dropped
		const startTimeInPx = dropZonePositionLeft - CONSTS.timelineRowOffset;

		// convert the left offset from px into ms
		const startTimeInMs = (startTimeInPx / $currentTimelineScale) * CONSTS.secondsMultiplier;

		handleTimelineMediaDrop(mediaData, TimelineDropArea.TRACK, index, startTimeInMs);
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
	<!-- use the elementId of each element as the unqiue key to use when the data changes -->
	{#each track.elements as element, elementIndex (element.elementId)}
		<TimelineRowElement {element} {elementIndex} rowIndex={index}></TimelineRowElement>
	{/each}
</div>
