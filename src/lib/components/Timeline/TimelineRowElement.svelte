<script lang="ts">
	import {
		type ISelectedElement,
		type ITimelineDraggedElementPosition,
		type ITimelineElement,
		TimelineElementResizeSide
	} from '$lib/interfaces/Timeline';
	import { CONSTS } from '$lib/utils/consts';
	import {
		convertMsToPx,
		convertPxToMs,
		elementIsAnImage,
		getNextLeftElementEndTime,
		getNextRightElementStartTime,
		getRelativeMousePosition,
		getTailwindVariables,
		isCurrentElementBeingResized,
		onlyPrimaryButtonClicked
	} from '$lib/utils/utils';
	import { onMount } from 'svelte';
	import {
		currentTimelineScale,
		draggedElementData,
		draggedElementPosition,
		elementResizeData,
		isThumbBeingDragged,
		isTimelineElementBeingDragged,
		isTimelineElementBeingResized,
		selectedElement,
		thumbOffset,
		timelineTracks
	} from '../../../stores/store';
	import { draggable } from '@neodrag/svelte';
	import type { DragEventData } from '@neodrag/svelte';

	export let element: ITimelineElement = {} as ITimelineElement;
	export let elementIndex: number;
	export let rowIndex: number;

	$: isSelected = getSelectedElement($selectedElement);

	// dynamically calculate left offset of element
	// here we actually don't want to use the util function to convert to px since we want the leftOffset to update when the currentTimelineScale changes
	$: leftOffset = (element.playbackStartTime / CONSTS.secondsMultiplier) * $currentTimelineScale;

	// reset the position value for the element whenever any of the parameters changes
	$: resetPosition(element.playbackStartTime, CONSTS.secondsMultiplier, $currentTimelineScale);

	// set the left offset once in the beginning
	leftOffset = convertMsToPx(element.playbackStartTime);

	// the offset of the element within the parent
	let topOffset = 0;

	let position = { x: leftOffset, y: topOffset };

	// here we actually don't want to use the util function to convert to px since we want the elementWidth to update when the currentTimelineScale changes
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
		convertMsToPx(element.duration),
		'leftOffset:',
		leftOffset
	);

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

	// #region onMount
	onMount(() => {
		window.addEventListener('dragover', (e: DragEvent) => {
			if ($isTimelineElementBeingDragged) {
				e.preventDefault();
				e.stopPropagation();
				console.log('event listener on window while dragging');
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

	// set a new position using the updated x value and reset y offset
	function resetPosition(startTime: number, multiplier: number, scale: number) {
		const newOffset = (startTime / multiplier) * scale;

		// update the position, also reset y offset so the element gets placed into track again
		position = { x: newOffset, y: 0 };
	}

	function getSelectedElement(el: ISelectedElement) {
		const curELEqualsSelectedEl = el.elementId === element.elementId;

		if (curELEqualsSelectedEl) {
			// unselect this element if its currently selected and the new id is the same as this element
			if (isSelected) {
				selectedElement.set({ elementId: '', mediaType: undefined });
				return false;
			} else {
				return true;
			}
		}
		return false;
	}

	// #region drag stuff
	// get the starting mouse position when starting the dragging movement
	function getMousePosition(e: MouseEvent) {
		console.log('getMousePosition -> e:', e);
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

			console.log(
				'getMousePosition in if -> mouseStartPosition:',
				mouseStartPosition,
				'draggedElementPosition:',
				$draggedElementPosition
			);
		}
	}

	// handle start of dragging an element
	function onDragStart(e: CustomEvent<DragEventData>) {
		console.log('testStart -> e:', e);

		if ($isTimelineElementBeingResized || $isThumbBeingDragged) {
			return;
		}

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
			prevTrackIndex: rowIndex,
			prevElementIndex: elementIndex
		});

		draggedElementPosition.set(null);
		draggedElementPosition.set({
			left: elStartPosition.left,
			top: elStartPosition.top
		} as ITimelineDraggedElementPosition);

		console.log(
			'testStart -> elDomRect:',
			elDomRect,
			'tracksElBoundRect:',
			tracksElBoundRect,
			'startPosition:',
			elStartPosition,
			'startingMousePosition:',
			mouseStartPosition,
			'draggedElementData:',
			$draggedElementData,
			'draggedElementPosition',
			$draggedElementPosition
		);

		// const detail = e.detail as any;
		// onElementClick({
		// 	clientX: detail.offsetX,
		// 	clientY: detail.offsetY,
		// 	...e
		// } as unknown as MouseEvent);
	}

	// handles the event while an element is being dragged
	function onDrag(e: CustomEvent<DragEventData>) {
		console.log('test -> e:', e);

		if ($isTimelineElementBeingResized || $isThumbBeingDragged) {
			return;
		}

		if (elStartPosition && mouseStartPositioninTimeline) {
			draggedElementPosition.set({
				left: e.detail.offsetX + CONSTS.timelineRowOffset,
				top: e.detail.offsetY + CONSTS.timelineRowOffset,
				clickedX: mouseStartPositioninTimeline!.mouseXInTimeline + e.detail.offsetX,
				clickedY: mouseStartPositioninTimeline!.mouseYInTimeline + e.detail.offsetY
			} as ITimelineDraggedElementPosition);
		}
		console.log(
			'test -> draggedElementPosition:',
			$draggedElementPosition,
			'draggedElementData:',
			$draggedElementData,
			'$thumbOffset:',
			$thumbOffset
		);

		// const detail = e.detail as any;
		// onElementDrag({
		// 	clientX: detail.offsetX,
		// 	clientY: detail.offsetY,
		// 	buttons: 1,
		// 	...e
		// } as unknown as MouseEvent);
	}

	// handles the end of dragging/dropping the element
	function onDragEnd(e: CustomEvent<DragEventData>) {
		console.log('testEnd -> e:', e);

		if ($isTimelineElementBeingResized || $isThumbBeingDragged) {
			return;
		}

		// reset all variables to intial values
		dragging = false;
		isTimelineElementBeingDragged.set(false);
		mouseStartPosition = undefined;
		elStartPosition = undefined;

		// reset position so the timeline element gets placed inside a track again
		// setTimeout(() => {
		// 	topOffset = 0;
		// 	// manually trigger update of the left offset so the new offset is actually updated
		// 	leftOffset = convertMsToPx(element.playbackStartTime);

		// 	// leftOffset = $draggedElementPosition
		// 	// 	? $draggedElementPosition.left - CONSTS.timelineRowOffset
		// 	// 	: leftOffset;

		// 	console.error(
		// 		'Timeline -> timeline element dropped leftOffset:',
		// 		leftOffset,
		// 		'playbackStartTime:',
		// 		element.playbackStartTime
		// 	);

		// 	position = {
		// 		x: leftOffset,
		// 		y: topOffset
		// 	};
		// 	console.log(
		// 		'element dropped on divider in testEnd -> topOffset reset:',
		// 		position,
		// 		'element.playbackStartTime:',
		// 		element.playbackStartTime,
		// 		'convertMsToPx(element.playbackStartTime):',
		// 		convertMsToPx(element.playbackStartTime)
		// 	);
		// }, 0);

		// TODO: add element data to custom event so we can directly access it in the event listeners
		// create and dispatch custom event
		const event = new CustomEvent(CONSTS.customEventNameDropTimelineElement);
		window.dispatchEvent(event);

		// TODO: if at the point of mouse release the dragged element is neither over a timeline row or a divider we should check where to drop the element

		// const detail = e.detail as any;
		// onElementDrop({
		// 	clientX: detail.offsetX,
		// 	clientY: detail.offsetY,
		// 	buttons: 1,
		// 	...e
		// } as unknown as MouseEvent);
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

		console.log(
			'onResizeMouseMove left before calculate -> resizeStartPosition:',
			resizeStartPosition,
			'elementWidth:',
			elementWidth
		);

		// calculate difference between starting x position and current x position
		const dx = resizeStartPosition - e.x;

		// we need to block the resize if we try to increase the element size even though we haven't trimmed anything from that side
		if (dx > 0 && element.trimFromStart === 0 && !elementIsAnImage(element)) {
			return;
		}

		// update starting x position for the next call of the mouse move
		resizeStartPosition = e.x;

		console.error('onResizeLeft -> elementRef:', elementRef);

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

		console.error(
			'resizeLeft -> newLeftOffsetInMs:',
			newLeftOffsetInMs,
			'endTime:',
			newLeftOffsetInMs + newWidthInMs
		);

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

			console.log(
				'onResizeMouseMove left after calculate -> resizeStartPosition:',
				resizeStartPosition,
				'resizeStartWidth:',
				resizeStartWidth,
				'maxDuration:',
				element.maxDuration,
				'newWidthInMs:',
				newWidthInMs,
				'newTrimFromStart:',
				newTrimFromStart,
				'element.trimFromStart:',
				element.trimFromStart,
				'dx:',
				dx
			);

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

		console.log(
			'onResizeMouseMove right before calculate -> resizeStartPosition:',
			resizeStartPosition,
			'elementWidth:',
			elementWidth,
			'dx:',
			dx,
			'element.trimFromEnd:',
			element.trimFromEnd
		);

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

		console.error(
			'resizeRight -> end time:',
			elEndTime,
			'right element start time:',
			resizeData?.nextElBounds.nextRightEl
		);

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

			console.log(
				'onResizeMouseMove right after calculate -> resizeStartPosition:',
				resizeStartPosition,
				'resizeStartWidth:',
				resizeStartWidth,
				'maxDuration:',
				element.maxDuration,
				'newWidthInMs:',
				newWidthInMs,
				'newTrimFromEnd:',
				newTrimFromEnd,
				'element.trimFromEnd:',
				element.trimFromEnd,
				'dx:',
				dx
			);

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
</script>

<!-- #region drag element -->
<div
	class="timeline-row-element h-[50px] mr-5 rounded cursor-grab absolute"
	style="width: {elementWidth}px; background-color: {isSelected
		? tailwindColors.orange[500]
		: tailwindColors.red[500]}; z-index: {dragging ? '50' : 'auto'}"
	data-element-el-index={elementIndex}
	data-element-row-index={rowIndex}
	data-element-offset={element.playbackStartTime}
	data-element-id={element.elementId}
	use:draggable={{ position, handle: '.timeline-row-element-drag-area' }}
	on:mousedown={getMousePosition}
	on:mouseenter={() => (isHovering = true)}
	on:mouseleave={() => (isHovering = false)}
	on:neodrag:start={onDragStart}
	on:neodrag={onDrag}
	on:neodrag:end={onDragEnd}
	bind:this={elementRef}
>
	<!-- only clicking and dragging on this element will allow the parent to drag, anywhere else on the parent won’t work -->
	<!-- width of the "drag-area" will be the full element - the handle sizes -->
	<div class="timeline-row-element-drag-area w-[calc(100%-16px)] h-full absolute left-2"></div>

	<!-- element name shown -->
	<div
		class="timeline-row-element-name text-[12px] text-background-color-light ml-3 truncate select-none"
	>
		{element.mediaName}
	</div>

	<!-- TODO: JUST FOR DEBUGGING. REMOVE AFTER TESTING -->
	<div
		class="timeline-row-element-name text-[10px] text-background-color-light ml-3 truncate select-none"
	>
		{element.playbackStartTime / CONSTS.secondsMultiplier}s / {element.duration /
			CONSTS.secondsMultiplier}s
	</div>
	<div
		class="timeline-row-element-name text-[10px] text-background-color-light ml-3 truncate select-none"
	>
		elIndex:{elementIndex}/row:{rowIndex}
	</div>

	<!-- TODO: check if this works since when enabling it the thumb sometimes doesnt work correctly when trying to drag the element -->
	<!-- element image -->
	<!-- <div
		class="timeline-row-element-image absolute top-0 left-0 z-50"
		style="background-image: {element.mediaImage}; width: 50px; height: 50px;"
	></div> -->

	<!-- element handles to resize an element -->
	{#if isSelected || isHovering}
		<div
			class="timeline-row-element-handle absolute top-0 left-0 h-full bg-blue-400 w-2 cursor-ew-resize rounded-l"
			on:mousemove={onResizeLeft}
			on:mousedown={(e) => onHandleMouseDown(e, TimelineElementResizeSide.LEFT)}
		></div>
		<div
			class="timeline-row-element-handle absolute top-0 left-[calc(100%-8px)] h-full bg-blue-400 w-2 cursor-ew-resize rounded-r"
			on:mousemove={onResizeRight}
			on:mousedown={(e) => onHandleMouseDown(e, TimelineElementResizeSide.RIGHT)}
		></div>
	{/if}
</div>
