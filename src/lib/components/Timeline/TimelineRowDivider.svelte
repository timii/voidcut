<script lang="ts">
	import type { ITimelineDraggedElement } from '$lib/interfaces/Timeline';
	import { onMount } from 'svelte';
	import { draggedElement, isTimelineElementBeingDragged } from '../../../stores/store';
	import colors from 'tailwindcss/colors';
	import { CONSTS } from '$lib/utils/consts';

	let dividerRef: HTMLElement;

	// call function everytime the store variable changes
	$: isElementHovered($draggedElement);

	let tracksElBoundRect: DOMRect;
	let dividerElBoundRect: DOMRect;
	let offsetInParent: { left: number; top: number };
	let elementOverDivider = false;

	onMount(() => {
		const tracksEl = document.getElementsByClassName('timeline-tracks')[0];
		tracksElBoundRect = tracksEl.getBoundingClientRect();
		dividerElBoundRect = dividerRef.getBoundingClientRect();

		offsetInParent = {
			left: dividerElBoundRect.left - tracksElBoundRect.left,
			top: dividerElBoundRect.top - tracksElBoundRect.top
		};

		// listen to event when a timeline element is dropped
		window.addEventListener(CONSTS.customEventNameDropTimelineElement, () => {
			console.log(
				`${CONSTS.customEventNameDropTimelineElement} event triggered in divider -> isElementHovered:`,
				elementOverDivider
			);

			// TODO: add/move timeline element to new index in store variable
		});
	});

	// check if an element is hovered over the divider
	function isElementHovered(draggedEl: ITimelineDraggedElement | null) {
		if (!draggedEl) return;

		// current mouse position on the y axis
		const curYPos = draggedEl.top + draggedEl.clickedY;
		elementOverDivider =
			curYPos >= offsetInParent.top && curYPos <= offsetInParent.top + dividerElBoundRect.height;
		// console.log(
		// 	'isElementHovered -> draggedEl',
		// 	draggedEl,
		// 	'dividerBounds:',
		// 	dividerElBoundRect,
		// 	'offsetInParent:',
		// 	offsetInParent,
		// 	'curYPos:',
		// 	curYPos,
		// 	'elementOverDivider:',
		// 	elementOverDivider
		// );
	}
</script>

<div
	class="track-divider w-ful h-[4px] rounded-sm"
	style="background-color: {elementOverDivider && $isTimelineElementBeingDragged
		? 'red'
		: colors.slate[500]}"
	bind:this={dividerRef}
></div>
