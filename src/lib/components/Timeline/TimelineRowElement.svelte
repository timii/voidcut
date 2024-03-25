<script lang="ts">
	import type { ITimelineElement } from '$lib/interfaces/Timeline';
	import { CONSTS } from '$lib/utils/consts';
	import { getTailwindVariables } from '$lib/utils/utils';
	import {
		currentTimelineScale,
		isThumbBeingDragged,
		isTimelineElementBeingDragged,
		selectedElement
	} from '../../../stores/store';

	export let element: ITimelineElement = {} as ITimelineElement;

	// check if selected element matches id of this element
	$: isSelected = $selectedElement === element.elementId;

	// dynamically calculate left offset of element
	$: leftOffset = (element.playbackStartTime / CONSTS.secondsMultiplier) * $currentTimelineScale;
	// set the left offset once in the beginning
	leftOffset = (element.playbackStartTime / CONSTS.secondsMultiplier) * $currentTimelineScale;

	$: elementWidth = (element.duration / CONSTS.secondsMultiplier) * $currentTimelineScale;
	console.log(
		'TimelineRowElement -> element:',
		element,
		'width:',
		elementWidth,
		'duration:',
		element.duration,
		'scale:',
		$currentTimelineScale,
		'calc:',
		(element.duration / CONSTS.secondsMultiplier) * $currentTimelineScale,
		'leftOffset:',
		leftOffset
	);

	const tailwindVariables = getTailwindVariables();
	const tailwindColors = tailwindVariables.theme.colors;
	let elementRef: HTMLElement;
	let dragging = false;

	// function dragElement(e: DragEvent) {
	// 	// e.preventDefault();
	// 	// e.stopPropagation();
	// 	console.log('drag -> e:', e);

	// 	// if (e.dataTransfer) {
	// 	// e.dataTransfer.effectAllowed = 'move';
	// 	// }
	// }

	// function dragStartElement(e: DragEvent) {
	// 	// e.preventDefault();
	// 	// e.stopPropagation();
	// 	console.log('dragStart -> e:', e);

	// 	// stringify element data to pass it via drag and drop
	// 	e.dataTransfer?.setData(CONSTS.timelineElTransferKey, 'test');
	// 	// if (e.dataTransfer) {
	// 	// 	e.dataTransfer.effectAllowed = 'move';
	// 	// }
	// }

	// function drag(e: DragEvent) {
	// 	e.stopPropagation();
	// 	// e.preventDefault();
	// 	draggedItem.style.left = `${e.clientX - dx}`;
	// 	draggedItem.style.top = `${e.clientY - dy}`;
	// }
	// function dragStart(e: DragEvent) {
	// 	// e.stopPropagation();
	// 	// e.preventDefault();
	// 	draggedItem = e.target as HTMLElement;
	// 	if (draggedItem) {
	// 		dx = e.clientX - draggedItem.getBoundingClientRect().x;
	// 		dy = e.clientY - draggedItem.getBoundingClientRect().y;
	// 	}
	// }
	// function dragLeave(e: DragEvent) {
	// 	// e.stopPropagation();
	// 	// e.preventDefault();
	// 	// Clear temporary data
	// 	dx = dy = 0;
	// }

	function onElementClick(e: MouseEvent) {
		// avoid timeline thumb being dragged when clicking on element
		e.stopPropagation();
		$selectedElement = element.elementId;
		console.log('click element -> e:', e);
	}

	function onElementDrop(e: MouseEvent) {
		e.preventDefault();
		console.log(
			'drop element -> e:',
			e,
			'get(isTimelineElementBeingDragged)',
			$isTimelineElementBeingDragged
		);

		dragging = false;

		console.log(
			'drop element after delay -> e:',
			e,
			'get(isTimelineElementBeingDragged)',
			$isTimelineElementBeingDragged
		);
	}

	function drag(e: DragEvent) {
		console.log('onElementDrag in if -> e:', e);
		dragging = true;
		isTimelineElementBeingDragged.set(true);
	}

	// overwrite the event listener from parent element in timeline
	function onPointerMove(e: MouseEvent) {
		if (e.buttons === 1 && !$isThumbBeingDragged) {
			isTimelineElementBeingDragged.set(true);
		}
		if (!$isThumbBeingDragged) {
			e.stopPropagation();
		}
	}

	function onElementDrag(e: MouseEvent) {
		// only drag element if mouse is held down and the timeline thumb is currently not being dragged
		if (e.buttons === 1 && !$isThumbBeingDragged) {
			// avoid timeline thumb being dragged when dragging over element
			e.stopPropagation();
			e.preventDefault();
			// console.log('onElementDrag in if -> e:', e);
			// dragging = true;

			// TODO: clone element
			// TODO: hide original element
			// TODO: put clone in position of original element
			// TODO: add drag event listeners to clone
			// TODO: when dropping delete clone and move original to new position
		}
		// 	// avoid timeline thumb being dragged when dragging the mouse over it
		// 	e.stopPropagation();
		// 	// calculate new position using the mouse position on the x axis, the left thumb offset and the amount scrolled horizontally
		// 	// TODO: we need to use a new calcualtion because we can't directly use the mouse position and instead calculate the difference the mouse moved to see where we need to move the element
		// 	console.log(
		// 		'onElementDrag -> event:',
		// 		e,
		// 		'elementRef:',
		// 		elementRef,
		// 		'element position',
		// 		elementRef.offsetLeft
		// 	);
		// 	const elBoundingRect = elementRef.getBoundingClientRect();
		// 	// get width of element
		// 	const elWidth = elBoundingRect.width;
		// 	const elLeftOffset = elBoundingRect.left;
		// 	console.log(
		// 		'onElementDrag -> elWidth:',
		// 		elWidth,
		// 		'elLeftOffset:',
		// 		elLeftOffset,
		// 		'leftOffset - thumbOffset:',
		// 		elLeftOffset - $thumbOffset
		// 	);
		// 	const newPos = e.clientX - $thumbOffset + $horizontalScroll;
		// 	// avoid the element to be moved further left than the tracks
		// 	if (newPos >= 0) {
		// 		const scrolledPxInSeconds = Math.round(
		// 			(newPos / $currentTimelineScale) * CONSTS.secondsMultiplier
		// 		);
		// 		console.log('onElementDrag -> newPos:', newPos, 'in seconds:', scrolledPxInSeconds);
		// 		element.playbackStartTime = scrolledPxInSeconds;
		// 		// leftOffset = newPos;
		// 		// TODO: calculate horizontal position when dragging
		// 		// TODO: update timeline tracks with correct offset
		// 		const indeces = getIndexOfElementInTracks();
		// 		if (!indeces) {
		// 			return;
		// 		}
		// 		const firstIndex = indeces[0];
		// 		const secondIndex = indeces[1];
		// 		timelineTracks.update(
		// 			(tracks) => {
		// 				const track = tracks[firstIndex];
		// 				const newEl = track.elements[secondIndex];
		// 				const obj: ITimelineElement = {
		// 					...newEl
		// 					// playbackStartTime: scrolledPxInSeconds
		// 				};
		// 				track.elements[secondIndex] = obj;
		// 				tracks[firstIndex] = track;
		// 				console.log('onElementDrag -> tracks after mapping:', tracks);
		// 				return tracks;
		// 			}
		// 			// tracks.map(
		// 			// (track) => track.elements.map((el) => el)
		// 			// track.elements.map((el) => {
		// 			// 	if (el.elementId === element.elementId) {
		// 			// 		return {
		// 			// 			...el,
		// 			// 			playbackStartTime: newPos
		// 			// 		};
		// 			// 	}
		// 			// 	return el;
		// 			// })
		// 			// )
		// 		);
		// 		if (!$isTimelineElementBeingDragged) {
		// 			$isTimelineElementBeingDragged = true;
		// 			console.log('isTimelineElementBeingDragged?:', $isTimelineElementBeingDragged);
		// 		}
		// 	}
		// }
	}
</script>

<div
	draggable="true"
	class="timeline-row-element h-[50px] mr-5 rounded"
	style="width: {elementWidth}px; background-color: {isSelected
		? tailwindColors.orange[500]
		: tailwindColors.red[500]}; transform: translateX({leftOffset}px); display: {dragging
		? 'none'
		: 'unset'}"
	on:mousedown={onElementClick}
	on:pointermove={onPointerMove}
	on:drag={drag}
	on:dragend={onElementDrop}
	bind:this={elementRef}
></div>
<!-- <div
	class="clone h-[50px] mr-5 rounded absolute"
	style="width: {elementWidth}px; background-color: {isSelected
		? tailwindColors.orange[500]
		: tailwindColors.red[500]}; transform: translateX({leftOffset}px); display: {dragging
		? 'unset'
		: 'none'}"
></div> -->

<!-- <div
	draggable="true"
	class=" h-[50px] mr-5 rounded"
	style="width: {elementWidth}px; background-color: {isSelected
		? tailwindColors.orange[500]
		: tailwindColors.red[500]}; transform: translateX({leftOffset}px);"
	on:mousedown={onElementClick}
	on:mousemove={onElementDrag}
	on:mouseup={onElementDrop}
	bind:this={elementRef}
></div> -->
<!-- <div
	draggable="true"
	class=" h-[50px] mr-5 rounded"
	style="width: {elementWidth}px; background-color: {isSelected
		? tailwindColors.orange[500]
		: tailwindColors.red[500]}; transform: translateX({leftOffset}px)"
	on:mousedown={onElementClick}
	on:mousemove={onElementDrag}
	on:drag={dragElement}
	on:dragstart={dragStartElement}
	bind:this={elementRef}
></div> -->
