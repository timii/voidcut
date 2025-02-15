<script lang="ts">
	import {
		TimelineDropArea,
		type ITimelineDraggedElementPosition,
		type ITimelineTrack
	} from '$lib/interfaces/Timeline';
	import { onMount } from 'svelte';
	import {
		currentTimelineScale,
		draggedElementData,
		draggedElementPosition,
		draggedOverThreshold,
		isTimelineElementBeingDragged,
		thumbOffset
	} from '../../../stores/store';
	import TimelineRowElement from './TimelineRowElement.svelte';
	import { CONSTS } from '$lib/utils/consts';
	import { convertMsToPx, handleTimelineMediaDrop, resetOverUnderDividers } from '$lib/utils/utils';
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
	});

	// TODO: refactor to be a util function (including the function in the divider)
	// check if timeline element is currently hovered over row
	function isElementHovered(draggedEl: ITimelineDraggedElementPosition | null) {
		if (!draggedEl || !$draggedElementData || !rowRef || !$draggedOverThreshold) return;

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
			// limit the drop zone offset to the left so it doesn't go further left than the track
			dropZonePositionLeft = Math.max(draggedEl.left, CONSTS.timelineRowOffset);

			const draggelElWidth = $draggedElementData.width;
			// if the current element width is different to the dragged element width, update it
			if (elementWidth !== draggelElWidth) {
				// set drop zone width to be the same as the dragged element width
				elementWidth = draggelElWidth;
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

		resetOverUnderDividers();

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

		console.log('drop element -> left:', dropZonePositionLeft, dropZonePositionLeft - $thumbOffset);

		// get the left offset where the element was dropped
		const startTimeInPx = dropZonePositionLeft - CONSTS.timelineRowOffset;

		// convert the left offset from px into ms
		const startTimeInMs = (startTimeInPx / $currentTimelineScale) * CONSTS.secondsMultiplier;

		handleTimelineMediaDrop(mediaData, TimelineDropArea.TRACK, index, startTimeInMs);
	}
</script>

<div
	class="timeline-row h-[50px] w-full mr-5 rounded flex bg-background-timeline-row"
	data-row-index={index}
	on:drop={onDropElement}
	on:dragleave={onDropElement}
	on:dragenter={onHoverElement}
	on:dragover={onHoverElement}
	bind:this={rowRef}
>
	<!-- element that is shown when a media pool element is being dragged -->
	<div
		class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed outline-hover-outline z-10 absolute bg-hover-stipes"
		style="width: {dropZoneWidth}px; display: {hoverElement
			? 'unset'
			: 'none'}; left: {dropZonePositionLeft}px;"
	></div>

	<!-- element that is shown when an timeline element is being dragged -->
	<div
		class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed outline-hover-outline z-10 absolute bg-hover-stipes"
		style="width: {elementWidth}px; display: {elementHoveredOverRow &&
		$isTimelineElementBeingDragged
			? 'unset'
			: 'none'}; left: {dropZonePositionLeft}px;"
	></div>
	<!-- use the elementId of each element as the unqiue key to use when the data changes -->
	{#each track.elements as element, elementIndex (element.elementId)}
		<TimelineRowElement {element} {elementIndex} rowIndex={index}></TimelineRowElement>
	{/each}
</div>
