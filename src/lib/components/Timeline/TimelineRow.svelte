<script lang="ts">
	import type { ITimelineDraggedElement, ITimelineTrack } from '$lib/interfaces/Timeline';
	import { onMount } from 'svelte';
	import {
		currentTimelineScale,
		draggedElement,
		isTimelineElementBeingDragged,
		timelineTracks
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

			// TODO : add/move timeline element to correct position in the row and move other elements if necessary
			timelineTracks.update((tracks) => {
				// find dragged element using the element id
				let foundEl = undefined;
				let i = 0;
				while (!foundEl && i < tracks.length) {
					foundEl = tracks[i].elements.find((el) => el.elementId === elementId);
					i++;
				}

				if (foundEl) {
					// convert the x value from px into ms
					const xInMs = Math.round((x / $currentTimelineScale) * CONSTS.secondsMultiplier) || 0;
					// set the new playback start time (in ms)
					foundEl.playbackStartTime = xInMs;
					console.log('drop-timeline-element -> foundEl:', foundEl, 'x in ms:', xInMs);
					return tracks;
				} else {
					return tracks;
				}
				// const foundEl = tracks.find((track) =>
				// 	track.elements.find((el) => el.elementId === elementId)
				// );
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
</script>

<div class="timeline-row bg-ruler-color h-[50px] w-full mr-5 rounded flex" bind:this={rowRef}>
	<!-- <div
		class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed z-10"
		style="width: {elementWidth}px; display: {elementHoveredOverRow &&
		$isTimelineElementBeingDragged
			? 'unset'
			: 'none'}; background-color: green; transform: translate3d({dropZonePositionLeft}px, 0, 0);"
	></div> -->
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
