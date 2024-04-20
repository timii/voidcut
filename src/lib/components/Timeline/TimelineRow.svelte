<script lang="ts">
	import type { ITimelineDraggedElement, ITimelineTrack } from '$lib/interfaces/Timeline';
	import { onMount } from 'svelte';
	import {
		currentTimelineScale,
		draggedElement,
		isTimelineElementBeingDragged
	} from '../../../stores/store';
	import TimelineRowElement from './TimelineRowElement.svelte';
	import { CONSTS } from '$lib/utils/consts';

	export let track: ITimelineTrack;
	console.log('TimelineRow -> track:', track);

	// call function everytime the store variable changes
	$: isElementHovered($draggedElement);

	// $: elementWidth = (element.duration / CONSTS.secondsMultiplier) * $currentTimelineScale;

	let rowRef: HTMLElement;

	let dropZonePositionLeft = 0;
	let elementHoveredOverRow = false;
	let tracksElBoundRect: DOMRect;
	let elementWidth = 0;

	onMount(() => {
		const tracksEl = document.getElementsByClassName('timeline-tracks')[0];
		tracksElBoundRect = tracksEl.getBoundingClientRect();
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
			// limit the drop zone offset to 0 so it doesn't go too far to the left
			dropZonePositionLeft = Math.max(draggedEl.left - 20, 0);

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
</script>

<div class="timeline-row bg-ruler-color h-[50px] w-full mr-5 rounded flex" bind:this={rowRef}>
	<div
		class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed z-10"
		style="width: {elementWidth}px; display: {elementHoveredOverRow &&
		$isTimelineElementBeingDragged
			? 'unset'
			: 'none'}; background-color: green; transform: translate3d({dropZonePositionLeft}px, 0, 0);"
	></div>
	{#each track.elements as element}
		<TimelineRowElement {element}></TimelineRowElement>
	{/each}
</div>
