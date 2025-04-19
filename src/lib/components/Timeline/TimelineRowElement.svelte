<script lang="ts">
	import {
		type ISelectedElement,
		type ITimelineDraggedElementData,
		type ITimelineDraggedElementPosition,
		type ITimelineElement,
		TimelineElementResizeSide
	} from '$lib/interfaces/Timeline';
	import { CONSTS } from '$lib/utils/consts';
	import {
		convertMsToPx,
		convertPxToMs,
		elementIsAnImage,
		getRelativeMousePosition,
		getTailwindVariables,
		onlyPrimaryButtonClicked
	} from '$lib/utils/utils';
	import { onMount } from 'svelte';
	import {
		currentTimelineScale,
		draggedElementData,
		draggedElementPosition,
		draggedOverThreshold,
		elementResizeData,
		isThumbBeingDragged,
		isTimelineElementBeingDragged,
		isTimelineElementBeingResized,
		selectedElement,
		timelineTracks
	} from '../../../stores/store';
	import { draggable } from '@neodrag/svelte';
	import type { DragEventData } from '@neodrag/svelte';
	import { MediaType } from '$lib/interfaces/Media';
	import {
		getNextLeftElementEndTime,
		getNextRightElementStartTime,
		isCurrentElementBeingResized
	} from '$lib/utils/timeline.utils';

	export let element: ITimelineElement = {} as ITimelineElement;
	export let elementIndex: number;
	export let rowIndex: number;

	$: isSelected = getSelectedElement($selectedElement);

	// dynamically calculate left offset of element
	// here we actually don't want to use the util function to convert to px since we want the leftOffset to update when the currentTimelineScale changes
	$: leftOffset = (element.playbackStartTime / CONSTS.secondsMultiplier) * $currentTimelineScale;

	// reset the position value for the element whenever any of the parameters changes
	$: resetPosition(element.playbackStartTime, CONSTS.secondsMultiplier, $currentTimelineScale);

	// update svg variables when the timeline scale changes
	$: updateSvgVariables($currentTimelineScale);

	// set the left offset once in the beginning
	leftOffset = convertMsToPx(element.playbackStartTime);

	// the offset of the element within the parent
	let topOffset = 0;

	let position = { x: leftOffset, y: topOffset };

	// here we actually don't want to use the util function to convert to px since we want the elementWidth to update when the currentTimelineScale changes
	$: elementWidth = (element.duration / CONSTS.secondsMultiplier) * $currentTimelineScale;

	const tailwindVariables = getTailwindVariables();
	const tailwindColors = tailwindVariables.theme.colors;
	let elementRef: HTMLElement;
	let dragging = false;
	let tracksElBoundRect: DOMRect;
	let mouseStartPosition:
		| undefined
		| { left: number; top: number; mouseXInEl: number; mouseYInEl: number };
	let mouseStartPositioninTimeline:
		| undefined
		| { mouseXInTimeline: number; mouseYInTimeline: number };
	let elStartPosition: undefined | { left: number; top: number };
	let isHovering = false;
	let resizeStartPosition = -1;
	let resizeStartWidth: number | undefined = undefined;
	let svgFullWidth: number = getFullWidth();
	let svgLeftTrim: number = element.trimFromStart;

	// #region onMount
	onMount(() => {
		// TODO: refactor these event listeners out into timeline component, so we don't keep adding new event listeners when a new element is created
		window.addEventListener('dragover', (e: DragEvent) => {
			if ($isTimelineElementBeingDragged) {
				e.preventDefault();
				e.stopPropagation();
			}
		});

		// listen to the left resize event and handle resize on call
		window.addEventListener(CONSTS.customEventNameElementResizeLeft, (e: Event) => {
			const eventDetail = (e as CustomEvent).detail;

			// only resize if the element id in the details match the current element
			if (eventDetail.elementId === element.elementId) {
				onResizeLeft(eventDetail.event);
			}
		});

		// listen to the right resize event and handle resize on call
		window.addEventListener(CONSTS.customEventNameElementResizeRight, (e: Event) => {
			const eventDetail = (e as CustomEvent).detail;

			// only resize if the element id in the details match the current element
			if (eventDetail.elementId === element.elementId) {
				onResizeRight(eventDetail.event);
			}
		});
	});

	function updateSvgVariables(_: number) {
		// update the variables used by the svg when timeline scale changed
		svgFullWidth = getFullWidth();
		svgLeftTrim = convertMsToPx(element.trimFromStart);
	}

	// set a new position using the updated x value and reset y offset
	function resetPosition(startTime: number, multiplier: number, scale: number) {
		const newOffset = (startTime / multiplier) * scale;

		// update the position, also reset y offset so the element gets placed into track again
		position = { x: newOffset, y: 0 };
	}

	function getSelectedElement(el: ISelectedElement) {
		// return if the element id in the store matches current element id
		return el.elementId === element.elementId;
	}

	// #region drag stuff
	// get the starting mouse position when starting the dragging movement
	function getMousePosition(e: MouseEvent) {
		if ($isTimelineElementBeingResized || $isThumbBeingDragged) {
			return;
		}

		if (!mouseStartPosition) {
			if (!tracksElBoundRect) {
				// TODO: refactor this out into a util function since we use these two lines quite often
				const tracksEl = document.getElementsByClassName('timeline-tracks')[0];
				tracksElBoundRect = tracksEl.getBoundingClientRect();
			}
			const mousePosInEl = getRelativeMousePosition(e, tracksElBoundRect);
			if (!elStartPosition) return;

			mouseStartPosition = {
				left: e.clientX,
				top: e.clientY,
				mouseXInEl: mousePosInEl.x - elStartPosition.left,
				mouseYInEl: mousePosInEl.y - elStartPosition.top
			};
			mouseStartPositioninTimeline = {
				mouseXInTimeline: mouseStartPosition.mouseXInEl + elStartPosition.left,
				mouseYInTimeline: mouseStartPosition.mouseYInEl + elStartPosition.top
			};

			isTimelineElementBeingDragged.set(true);
			dragging = true;

			if (!mouseStartPositioninTimeline) return;

			draggedElementPosition.update(
				(value) =>
					({
						...value,
						clickedX: mouseStartPositioninTimeline!.mouseXInTimeline,
						clickedY: mouseStartPositioninTimeline!.mouseYInTimeline
					}) as ITimelineDraggedElementPosition
			);
		}
	}

	// handle start of dragging an element
	function onDragStart(e: CustomEvent<DragEventData>) {
		if ($isTimelineElementBeingResized || $isThumbBeingDragged) {
			return;
		}

		isTimelineElementBeingDragged.set(true);

		// update selected element sore value with current element data
		selectedElement.set({ mediaType: element.type, elementId: element.elementId });

		const curEl = e.detail.currentNode;
		const elDomRect = curEl.getBoundingClientRect();
		const tracksEl = document.getElementsByClassName('timeline-tracks')[0];
		tracksElBoundRect = tracksEl.getBoundingClientRect();

		elStartPosition = {
			left: elDomRect.left - tracksElBoundRect.left,
			top: elDomRect.top - tracksElBoundRect.top
		};

		// reset store value
		draggedElementData.set(null);
		// set values that we already know of
		draggedElementData.set({
			height: elDomRect.height,
			width: elDomRect.width,
			elementId: element.elementId,
			data: element,
			eventDetail: e.detail,
			prevTrackIndex: rowIndex,
			prevElementIndex: elementIndex
		});

		// draggedElementPosition.set(null);
		draggedElementPosition.update(
			(value) =>
				({
					...value,
					left: elStartPosition!.left,
					top: elStartPosition!.top,
					startX: e.detail.offsetX,
					startY: e.detail.offsetY
				}) as ITimelineDraggedElementPosition
		);
	}

	// handles the event while an element is being dragged
	function onDrag(e: CustomEvent<DragEventData>) {
		if ($isTimelineElementBeingResized || $isThumbBeingDragged) {
			return;
		}

		if (!elStartPosition || !mouseStartPositioninTimeline || !$draggedElementPosition) {
			return;
		}

		// check if we already dragged more than the threshold, if not calculate if we now dragged more than the threshold
		if (!$draggedOverThreshold) {
			// get the new x and y offset from the dragged element
			const newOffsetX = e.detail.offsetX;
			const newOffsetY = e.detail.offsetY;

			// calculate the difference between the new offset and the starting offset
			const diffX = Math.abs(newOffsetX - $draggedElementPosition.startX);
			const diffY = Math.abs(newOffsetY - $draggedElementPosition.startY);

			// check if element is dragged more than the threshold along either the y or x axis
			const overThreshold =
				diffX >= CONSTS.timelineElementThreshold || diffY >= CONSTS.timelineElementThreshold;

			// if dragged over the threshold we update the store value
			if (overThreshold) {
				draggedOverThreshold.set(overThreshold);
				isTimelineElementBeingDragged.set(true);
			} else {
				return;
			}
		}

		draggedElementPosition.update(
			(value) =>
				({
					...value,
					left: e.detail.offsetX + CONSTS.timelineRowOffset,
					top: e.detail.offsetY + CONSTS.timelineRowOffset,
					clickedX: mouseStartPositioninTimeline!.mouseXInTimeline + e.detail.offsetX,
					clickedY: mouseStartPositioninTimeline!.mouseYInTimeline + e.detail.offsetY
				}) as ITimelineDraggedElementPosition
		);
	}

	// handles the end of dragging/dropping the element
	function onDragEnd(e: CustomEvent<DragEventData>) {
		if ($isTimelineElementBeingResized || $isThumbBeingDragged) {
			return;
		}

		// reset all variables to intial values
		dragging = false;
		isTimelineElementBeingDragged.set(false);
		mouseStartPosition = undefined;
		elStartPosition = undefined;
		draggedOverThreshold.set(false);

		const curEl = e.detail.currentNode;
		const elDomRect = curEl.getBoundingClientRect();

		// create data object that will be used in the event
		const data: ITimelineDraggedElementData = {
			height: elDomRect.height,
			width: elDomRect.width,
			elementId: element.elementId,
			data: element,
			eventDetail: e.detail,
			prevTrackIndex: rowIndex,
			prevElementIndex: elementIndex
		};

		// create and dispatch custom event with drag data in event detail
		const event = new CustomEvent(CONSTS.customEventNameDropTimelineElement, { detail: data });
		window.dispatchEvent(event);
	}
	// #endregion drag stuff

	// #region resize
	// handle the resizing of element using the left handle
	function onResizeLeft(e: MouseEvent) {
		// avoid the thumb being also moved to where the handle is
		e.stopPropagation();
		e.stopImmediatePropagation();

		if ($isTimelineElementBeingDragged || $isThumbBeingDragged) {
			return;
		}

		if (!onlyPrimaryButtonClicked(e)) {
			return;
		}

		// only resize if the resized element id matches the current element
		if (!isCurrentElementBeingResized(element)) {
			return;
		}

		// calculate difference between starting x position and current x position
		const dx = resizeStartPosition - e.x;

		// we need to block the resize if we try to increase the element size even though we haven't trimmed anything from that side
		if (dx > 0 && element.trimFromStart === 0 && !elementIsAnImage(element)) {
			return;
		}

		// update starting x position for the next call of the mouse move
		resizeStartPosition = e.x;

		// add the pixel difference to the width
		const newWidth = parseInt(getComputedStyle(elementRef, '').width) + dx;

		// convert the new width into milliseconds
		const newWidthInMs = convertPxToMs(newWidth);

		// check if current width + dx is bigger than maxDuration, if yes we can't increase the size further
		// if maxDuration is undefined the user can resize the element as much as they want to
		if (element.maxDuration && newWidthInMs > element.maxDuration) {
			return;
		}

		// if the new width is smaller than the minimum width, the element size can't be decreaseed further
		if (newWidthInMs < CONSTS.timelineElementMinWidthMs) {
			return;
		}

		// add the size difference to the left offset
		const newLeftOffset = leftOffset + -dx;

		// check if the new leftOffset goes outside the left border of the timeline row, if yes we can't resize further
		if (newLeftOffset < 0) {
			return;
		}

		// calculate new leftOffset using the difference from last update
		leftOffset = newLeftOffset;

		// convert new offset into milliseconds to use as playbackStartTime
		const newLeftOffsetInMs = convertPxToMs(newLeftOffset);

		const resizeData = $elementResizeData;

		// check if a element to the left even exists on the current track
		const doesElToTheLeftExist =
			resizeData !== undefined && resizeData.nextElBounds.nextLeftEl !== undefined;

		// check if the element overlaps with any element to the left, if yes we can't resize further
		if (doesElToTheLeftExist && newLeftOffsetInMs < resizeData.nextElBounds.nextLeftEl!) {
			return;
		}

		// increase/decrease size of element accordingly
		elementWidth = newWidth;

		// also move the element to the left by the same amount we increase/decreased the width
		position = { ...position, x: leftOffset };

		// update duration, playbackStartTime and mediaStartTime of element in store
		timelineTracks.update((tracks) => {
			const curEl = tracks[rowIndex].elements[elementIndex];

			let newTrimFromStart = element.trimFromStart;

			// only update the mediaStartTime when the current element is not an image
			if (!elementIsAnImage(element) && resizeStartWidth) {
				newTrimFromStart += resizeStartWidth - newWidthInMs;
				newTrimFromStart = Math.max(newTrimFromStart, 0);
			}

			// update the left offset for the svg if shown
			svgLeftTrim = convertMsToPx(newTrimFromStart);

			tracks[rowIndex].elements[elementIndex] = {
				...curEl,
				duration: newWidthInMs,
				playbackStartTime: newLeftOffsetInMs,
				trimFromStart: newTrimFromStart
			};

			return tracks;
		});

		resizeStartWidth = newWidthInMs;
	}

	// handle the resizing of element using the right handle
	function onResizeRight(e: MouseEvent) {
		// avoid the thumb being also moved to where the handle is
		e.stopPropagation();

		if ($isTimelineElementBeingDragged || $isThumbBeingDragged) {
			return;
		}

		if (!onlyPrimaryButtonClicked(e)) {
			return;
		}

		// only resize if the resized element id matches the current element
		if (!isCurrentElementBeingResized(element)) {
			return;
		}

		// calculate difference between starting x position and current x position
		// we need the negative value of it to correctly update the width, since when the mouse moves to the right
		// dx gets smaller, which is the opposite of what we want
		const dx = -(resizeStartPosition - e.x);

		// we need to block the resize if we try to increase the element size even though we haven't trimmed anything from that side
		if (dx > 0 && element.trimFromEnd === 0 && !elementIsAnImage(element)) {
			return;
		}

		// update starting x position for the next call of the mouse move
		resizeStartPosition = e.x;

		// add the pixel difference to the width
		const newWidth = parseInt(getComputedStyle(elementRef, '').width) + dx;

		// convert the new width into milliseconds
		const newWidthInMs = convertPxToMs(newWidth);

		const resizeData = $elementResizeData;

		const elEndTime = element.playbackStartTime + newWidthInMs;

		// check if an element to the right even exists on the current track
		const doesElToTheRightExist =
			resizeData !== undefined && resizeData.nextElBounds.nextRightEl !== undefined;

		// check if the element overlaps with any element to the right, if yes we can't resize further
		if (doesElToTheRightExist && elEndTime > resizeData.nextElBounds.nextRightEl!) {
			return;
		}

		// check if current width + dx is equal or bigger than maxDuration, if yes we can't increase the size further
		// if maxDuration is undefined the user can resize the element as much as they want to
		if (element.maxDuration && newWidthInMs > element.maxDuration) {
			return;
		}

		// if the new width is smaller than the minimum width, the element size can't be decreaseed further
		if (newWidthInMs < CONSTS.timelineElementMinWidthMs) {
			return;
		}

		// increase/decrease size of element accordingly
		elementWidth = newWidth;

		// update duration of element in store
		timelineTracks.update((tracks) => {
			const curEl = tracks[rowIndex].elements[elementIndex];

			let newTrimFromEnd = element.trimFromEnd;

			// only update the mediaStartTime when the current element is not an image
			if (!elementIsAnImage(element) && resizeStartWidth) {
				newTrimFromEnd += resizeStartWidth - newWidthInMs;
				newTrimFromEnd = Math.max(newTrimFromEnd, 0);
			}

			tracks[rowIndex].elements[elementIndex] = {
				...curEl,
				duration: newWidthInMs,
				trimFromEnd: newTrimFromEnd
			};

			return tracks;
		});

		resizeStartWidth = newWidthInMs;
	}

	// handle the first mouse down on an element handle
	function onHandleMouseDown(e: MouseEvent, side: TimelineElementResizeSide) {
		// avoid the thumb being also moved to where the handle is
		e.stopPropagation();

		// prevent weird behavior where the element handles are being dragged
		e.preventDefault();

		if ($isTimelineElementBeingDragged || $isThumbBeingDragged) {
			return;
		}

		// set current element as selected when starting to resize
		selectedElement.set({ elementId: element.elementId, mediaType: element.type });

		// get the end time of the next element to the left
		const leftElEndTime = getNextLeftElementEndTime(rowIndex, elementIndex);

		// get the start time of the next element to the right
		const rightElStartTime = getNextRightElementStartTime(rowIndex, elementIndex);

		if (onlyPrimaryButtonClicked(e) && !$isThumbBeingDragged) {
			isTimelineElementBeingResized.set(true);
			elementResizeData.set({
				side,
				timelineElementId: element.elementId,
				nextElBounds: { nextLeftEl: leftElEndTime, nextRightEl: rightElStartTime }
			});

			// initially set the starting position of the mouse so we can use it for the mouse move event
			resizeStartPosition = e.x;

			const elementWidthInMs = convertPxToMs(elementWidth);

			// keep track of the starting duration/width so we set it on mouse down
			resizeStartWidth = elementWidthInMs;
		}
	}
	// #endregion resize

	// get full width in px of current element
	function getFullWidth() {
		return convertMsToPx(element.duration + element.trimFromStart + element.trimFromEnd);
	}
</script>

<!-- #region drag element -->
<div
	class="timeline-row-element mr-5 rounded cursor-grab absolute"
	style="
		height: {CONSTS.timelineRowElementHeight}px;
		width: {elementWidth}px;
		z-index: {dragging ? '50' : 'auto'};
		background-color: {element.type === MediaType.Audio ? '#cc7000' : '#414149'};

	"
	data-element-el-index={elementIndex}
	data-element-row-index={rowIndex}
	data-element-offset={element.playbackStartTime}
	data-element-id={element.elementId}
	use:draggable={{
		position,
		handle: '.timeline-row-element-drag-area' // the element area that is used for dragging the element
	}}
	on:mousedown={getMousePosition}
	on:mouseenter={() => (isHovering = true)}
	on:mouseleave={() => (isHovering = false)}
	on:neodrag:start={onDragStart}
	on:neodrag={onDrag}
	on:neodrag:end={onDragEnd}
	bind:this={elementRef}
	role="none"
>
	<div
		class="absolute rounded outline outline-2 outline-hover-outline inset-[1px]"
		style="opacity: {isSelected ? '1' : '0'};"
	></div>

	<!-- only clicking and dragging on this element will allow the parent to drag, anywhere else on the parent won’t work -->
	<!-- width of the "drag-area" will be the full element - the handle sizes -->
	<div class="timeline-row-element-drag-area w-[calc(100%-16px)] h-full absolute left-2"></div>

	<div class="image-container h-full w-full relative pointer-events-none">
		{#if element.type === MediaType.Audio}
			<div
				class="overflow-hidden relative h-full w-full rounded"
				style="
					--fullWidth: {svgFullWidth}px;
					--leftTrim: -{svgLeftTrim}px;
				"
			>
				{@html element.timelineImage}
			</div>
		{:else}
			<div
				class="image absolute left-0 top-0 w-full h-full pointer-events-none bg-repeat-x rounded"
				style="
					--imageUrl: url({element.timelineImage});
					background-size: auto 100%;
				"
			></div>
		{/if}
	</div>

	<!-- element handles to resize an element -->
	{#if (isSelected || isHovering) && !$isTimelineElementBeingDragged}
		<div
			class="timeline-row-element-handle absolute top-0 left-0 h-full z-50 bg-accent-color w-2 cursor-ew-resize rounded-l"
			on:mousemove={onResizeLeft}
			on:mousedown={(e) => onHandleMouseDown(e, TimelineElementResizeSide.LEFT)}
			role="button"
			tabindex="0"
		></div>
		<div
			class="timeline-row-element-handle absolute top-0 left-[calc(100%-8px)] h-full z-50 bg-accent-color w-2 cursor-ew-resize rounded-r"
			on:mousemove={onResizeRight}
			on:mousedown={(e) => onHandleMouseDown(e, TimelineElementResizeSide.RIGHT)}
			role="button"
			tabindex="0"
		></div>
	{/if}
</div>

<style lang="postcss">
	.image {
		background-image: var(--imageUrl);
		background-repeat: repeat-x; /* repeat horizontally */
	}

	:global(.element-waveform) {
		width: var(--fullWidth) !important;
		position: absolute;
		left: var(--leftTrim);
	}
</style>
