<script lang="ts">
	import {
		type ITimelineDraggedElementHover,
		TimelineDropArea,
		type ITimelineTrack
	} from '$lib/interfaces/Timeline';
	import { onMount } from 'svelte';
	import {
		currentTimelineScale,
		draggedElementHover,
		isTimelineElementBeingDragged,
		thumbOffset
	} from '../../../stores/store';
	import TimelineRowElement from './TimelineRowElement.svelte';
	import { CONSTS } from '$lib/utils/consts';
	import {
		convertMsToPx,
		handleTimelineMediaDrop,
		isDraggedElementAFile,
		resetOverUnderDividers
	} from '$lib/utils/utils';
	import type { IMedia } from '$lib/interfaces/Media';

	export let track: ITimelineTrack;
	export let index: number;

	// check if the dragged element is hovered over current row
	$: isTimelineElementHovered($draggedElementHover);

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

	// check if a timeline element is hovered over current row
	function isTimelineElementHovered(hover: ITimelineDraggedElementHover | null) {
		// only show drop zone if hover is over current row and has the same index
		if (hover && hover.dropArea === TimelineDropArea.TRACK && hover.index === index) {
			elementHoveredOverRow = true;
			dropZonePositionLeft = hover.leftOffset ?? 0;

			const draggelElWidth = hover.width ?? 0;
			// if the current element width is different to the dragged element width, update it
			if (elementWidth !== draggelElWidth) {
				// set drop zone width to be the same as the dragged element width
				elementWidth = draggelElWidth;
			}
		} else {
			elementHoveredOverRow = false;
		}
	}

	// check if a media element is hovered over current row
	function onHoverElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();

		// don't highlight the row if an external file (that isn't added to media pool) is hovered over
		if (isDraggedElementAFile(e.dataTransfer?.items)) {
			return;
		}

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

		// only handle files when actually dropped
		if (!mediaData || e.type === 'dragleave') {
			return;
		}

		// get the left offset where the element was dropped
		const startTimeInPx = dropZonePositionLeft - CONSTS.timelineRowOffset;

		// convert the left offset from px into ms
		const startTimeInMs = (startTimeInPx / $currentTimelineScale) * CONSTS.secondsMultiplier;

		handleTimelineMediaDrop(mediaData, TimelineDropArea.TRACK, index, startTimeInMs);
	}
</script>

<div
	class="timeline-row w-full mr-5 rounded flex bg-background-timeline-row"
	style="height: {CONSTS.timelineRowElementHeight}px;"
	data-row-index={index}
	on:drop={onDropElement}
	on:dragleave={onDropElement}
	on:dragenter={onHoverElement}
	on:dragover={onHoverElement}
	bind:this={rowRef}
	role="none"
>
	<!-- element that is shown when a media pool element is being dragged -->
	<div
		class="clone-drop-zone mr-5 rounded outline-dashed outline-hover-outline z-10 absolute bg-hover-stipes"
		style="
			height: {CONSTS.timelineRowElementHeight}px; 
			width: {dropZoneWidth}px; 
			display: {hoverElement ? 'unset' : 'none'};
			left: {dropZonePositionLeft}px;
		"
	></div>

	<!-- element that is shown when a timeline element is being dragged -->
	<div
		class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed outline-hover-outline z-10 absolute bg-hover-stipes"
		style="
			height: {CONSTS.timelineRowElementHeight}px; 
			width: {elementWidth}px; 
			display: {elementHoveredOverRow && $isTimelineElementBeingDragged ? 'unset' : 'none'};
			left: {dropZonePositionLeft}px;
		"
	></div>
	<!-- use the elementId of each element as the unqiue key to use when the data changes -->
	{#each track.elements as element, elementIndex (element.elementId)}
		<TimelineRowElement {element} {elementIndex} rowIndex={index}></TimelineRowElement>
	{/each}
</div>
