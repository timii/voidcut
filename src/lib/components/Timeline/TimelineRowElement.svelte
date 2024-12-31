<script lang="ts">
	import {
		type ITimelineDraggedElement,
		type ITimelineDraggedElementPosition,
		type ITimelineElement,
		type ITimelineTrack,
		TimelineElementResizeSide
	} from '$lib/interfaces/Timeline';
	import { CONSTS } from '$lib/utils/consts';
	import {
		convertMsToPx,
		convertPxToMs,
		elementIsAnImage,
		getIndexOfElementInTrack,
		getNextLeftElementEndTime,
		getNextRightElementStartTime,
		getRelativeMousePosition,
		getTailwindVariables,
		onlyPrimaryButtonClicked
	} from '$lib/utils/utils';
	import { onMount } from 'svelte';
	import {
		currentTimelineScale,
		draggedElement,
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

	// // call function everytime the store variable changes
	// $: isElementHovered($draggedElement);
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

	// TODO: remove unused
	const tailwindVariables = getTailwindVariables();
	const tailwindColors = tailwindVariables.theme.colors;
	let elementRef: HTMLElement;
	let cloneRef: HTMLElement;
	let dragging = false;
	let clickInfo: {
		offsetLeft: number;
		offsetTop: number;
		mouseX: number;
		mouseY: number;
	};
	let tracksElBoundRect: DOMRect;
	// TODO: change to be a number instead
	let clonePositionLeft = '0px';
	let clonePositionTop = '0px';
	let cloneOffset = [0, 0];
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
	//

	// set a new position using the updated values and reset y offset
	function resetPosition(startTime: number, multiplier: number, scale: number) {
		const newOffset = (startTime / multiplier) * scale;
		console.warn(
		// 	`Timeline -> timeline row element ${element.mediaName} change value:`,
		// 	startTime,
		// 	'multiplier',
		// 	multiplier,
		// 	'scale',
		// 	scale,
		// 	'newOffset:',
		// 	newOffset
		// );

		// update the position, also reset y offset so the element gets placed into track again
		position = { x: newOffset, y: 0 };
	}

	function getSelectedElement(el: string) {
		const curELEqualsSelectedEl = el === element.elementId;

		if (curELEqualsSelectedEl) {
			// unselect this element if its currently selected and the new id is the same as this element
			if (isSelected) {
				selectedElement.set('');
				return false;
			} else {
				return true;
			}
		}
		return false;
	}

	// get info about relative element and mouse position of clicked element
	function getClickInfo(e: MouseEvent) {
		const tracksEl = document.getElementsByClassName('timeline-tracks')[0];
		const boundRect = elementRef.getBoundingClientRect();
		tracksElBoundRect = tracksEl.getBoundingClientRect();

		const mousePos = getRelativeMousePosition(e, tracksElBoundRect);
		clickInfo = {
			offsetLeft: boundRect.left - tracksElBoundRect.left,
			offsetTop: boundRect.top - tracksElBoundRect.top,
			mouseX: mousePos.x,
			mouseY: mousePos.y
		};
		return clickInfo;
	}

	function onElementClick(e: MouseEvent) {
		// avoid timeline thumb being dragged when clicking on element
		e.stopPropagation();

		// first clear store value and set correct value afterwards to trigger store change to all subscribers
		selectedElement.set('');
		selectedElement.set(element.elementId);

		const clickInfo = getClickInfo(e);

		// TODO: factor in left offset and that the tracks are at the bottom of the screen
		// TODO: get bounding cliint rect of original element and get left distance from it
		cloneOffset = [clickInfo.offsetLeft - clickInfo.mouseX, clickInfo.offsetTop - clickInfo.mouseY];

		// set the elementId of the dragged element store property
		draggedElement.update((el) => {
			return { ...el, elementId: element.elementId } as ITimelineDraggedElement;
		});
		console.log(
			'click element -> clickInfo:',
			clickInfo,
			'e.clientX:',
			e.clientX,
			'e.clientY:',
			e.clientY,
			'draggedElement',
			$draggedElement
		);
		console.log('click element -> e:', e, 'cloneOffset:', cloneOffset);
	}

	function onElementDrop(e: MouseEvent) {
		e.preventDefault();

		dragging = false;
		isTimelineElementBeingDragged.set(false);

		const draggedEl = $draggedElement;
		if (!draggedEl) return;

		console.log(
			'drop element -> e:',
			e,
			'get(isTimelineElementBeingDragged)',
			$isTimelineElementBeingDragged,
			'draggedElement:',
			draggedEl,
			'tracksElBoundRect:',
			tracksElBoundRect
		);

		// create and dispatch custom event
		const event = new CustomEvent(CONSTS.customEventNameDropTimelineElement);
		window.dispatchEvent(event);

		console.log(
			'drop element after delay -> e:',
			e,
			'get(isTimelineElementBeingDragged)',
			$isTimelineElementBeingDragged
		);
	}

	// function drag(e: DragEvent) {
	// 	console.log('onElementDrag in if -> e:', e);
	// 	// dragging = true;
	// 	// isTimelineElementBeingDragged.set(true);

	// 	// TODO: clone element
	// 	// TODO: hide original element
	// 	// TODO: put clone in position of original element
	// 	// const mousePosition = getRelativeMousePosition(e);

	// 	// clonePositionLeft = mousePosition.x + cloneOffset[0] + 'px';
	// 	// clonePositionTop = mousePosition.y + cloneOffset[1] + 'px';
	// 	// console.log(
	// 	// 	'onElementDrag in if -> clonePositionLeft:',
	// 	// 	clonePositionLeft,
	// 	// 	'clonePositionTop:',
	// 	// 	clonePositionTop,
	// 	// 	'mousePoistions x/y:',
	// 	// 	mousePosition.x,
	// 	// 	'/',
	// 	// 	mousePosition.y,
	// 	// 	'clickInfo:',
	// 	// 	clickInfo
	// 	// );

	// 	// TODO: add drag event listeners to clone
	// 	// TODO: when dropping delete clone and move original to new position
	// }

	function onElementDrag(e: MouseEvent) {
		if (e.buttons === 1 && !$isThumbBeingDragged) {
			console.log('onElementDrag in if -> e:', e, 'tracksElBoundRect:', tracksElBoundRect);
			dragging = true;
			isTimelineElementBeingDragged.set(true);

			const mousePosition = getRelativeMousePosition(e, tracksElBoundRect);
			clonePositionLeft = mousePosition.x + cloneOffset[0] + 'px';
			// dropZonePositionLeft = mousePosition.x + cloneOffset[0] - 20;
			clonePositionTop = mousePosition.y + cloneOffset[1] + 'px';
			// TODO: set store variable for currently dragged element as a replacement of the dataTransfer when dragging
			// Properties in the store variable -> left and top distance inside parent, width and height, elementId
			draggedElement.update((el) => {
				return {
					...el,
					left: mousePosition.x + cloneOffset[0],
					top: mousePosition.y + cloneOffset[1],
					width: elementWidth,
					height: 50,
					clickedX: Math.abs(cloneOffset[0]),
					clickedY: Math.abs(cloneOffset[1]),
					absoluteLeft: e.clientX,
					absoluteTop: e.clientY,
					data: element
				} as ITimelineDraggedElement;
			});
			console.log(
				'onElementDrag in if -> clonePositionLeft:',
				clonePositionLeft,
				'clonePositionTop:',
				clonePositionTop,
				'mousePoistions x/y:',
				mousePosition.x,
				'/',
				mousePosition.y,
				'cloneOffset:',
				cloneOffset,
				'clickInfo:',
				clickInfo,
				'draggedElement',
				$draggedElement
			);
		}
	}

	function onElementDragStart(e: DragEvent) {
		// overwrite default "ghost image" while dragging
		e.dataTransfer?.setDragImage(new Image(), 40, 20);

		dragging = true;
		isTimelineElementBeingDragged.set(true);
	}

	// overwrite the event listener from parent element in timeline
	function onPointerMove(e: MouseEvent) {
		if (e.buttons === 1 && !$isThumbBeingDragged && !$isTimelineElementBeingDragged) {
			isTimelineElementBeingDragged.set(true);
		}
		if (!$isThumbBeingDragged) {
			e.stopPropagation();
		}
	}

	function onCloneMove(e: DragEvent) {
		console.log('onCloneMove -> e:', e);
		e.preventDefault();
		if (e.buttons === 1) {
			const mousePosition = {
				x: e.clientX,
				y: e.clientY
			};
			clonePositionLeft = mousePosition.x + cloneOffset[0] + 'px';
			clonePositionTop = mousePosition.y + cloneOffset[1] + 'px';
			console.log(
				'onCloneMove in if -> clonePositionLeft:',
				clonePositionLeft,
				'clonePositionTop:',
				clonePositionTop
			);
		}
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

	// TODO: rename
	function testStart(e: CustomEvent<DragEventData>) {
		console.log('testStart -> e:', e);

		if ($isTimelineElementBeingResized || $isThumbBeingDragged) {
			return;
		}

		// first clear store value and set correct value afterwards to trigger store change to all subscribers
		selectedElement.set('');
		selectedElement.set(element.elementId);

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

	// TODO: rename
	function test(e: CustomEvent<DragEventData>) {
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

	// TODO: rename
	function testEnd(e: CustomEvent<DragEventData>) {
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

	// #region resize
	// TODO: set a minimum width for resizing and try to combine both left and right resizing function into one
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

	//#region old stuff
	// function onElementDrag(e: MouseEvent) {
	// 	// only drag element if mouse is held down and the timeline thumb is currently not being dragged
	// 	if (e.buttons === 1 && !$isThumbBeingDragged) {
	// 		// avoid timeline thumb being dragged when dragging over element
	// 		e.stopPropagation();
	// 		e.preventDefault();
	// 		// console.log('onElementDrag in if -> e:', e);
	// 		// dragging = true;
	// 	}
	// 	// 	// avoid timeline thumb being dragged when dragging the mouse over it
	// 	// 	e.stopPropagation();
	// 	// 	// calculate new position using the mouse position on the x axis, the left thumb offset and the amount scrolled horizontally
	// 	// 	// TODO: we need to use a new calcualtion because we can't directly use the mouse position and instead calculate the difference the mouse moved to see where we need to move the element
	// 	// 	console.log(
	// 	// 		'onElementDrag -> event:',
	// 	// 		e,
	// 	// 		'elementRef:',
	// 	// 		elementRef,
	// 	// 		'element position',
	// 	// 		elementRef.offsetLeft
	// 	// 	);
	// 	// 	const elBoundingRect = elementRef.getBoundingClientRect();
	// 	// 	// get width of element
	// 	// 	const elWidth = elBoundingRect.width;
	// 	// 	const elLeftOffset = elBoundingRect.left;
	// 	// 	console.log(
	// 	// 		'onElementDrag -> elWidth:',
	// 	// 		elWidth,
	// 	// 		'elLeftOffset:',
	// 	// 		elLeftOffset,
	// 	// 		'leftOffset - thumbOffset:',
	// 	// 		elLeftOffset - $thumbOffset
	// 	// 	);
	// 	// 	const newPos = e.clientX - $thumbOffset + $horizontalScroll;
	// 	// 	// avoid the element to be moved further left than the tracks
	// 	// 	if (newPos >= 0) {
	// 	// 		const scrolledPxInSeconds = Math.round(
	// 	// 			(newPos / $currentTimelineScale) * CONSTS.secondsMultiplier
	// 	// 		);
	// 	// 		console.log('onElementDrag -> newPos:', newPos, 'in seconds:', scrolledPxInSeconds);
	// 	// 		element.playbackStartTime = scrolledPxInSeconds;
	// 	// 		// leftOffset = newPos;
	// 	// 		// TODO: calculate horizontal position when dragging
	// 	// 		// TODO: update timeline tracks with correct offset
	// 	// 		const indeces = getIndexOfElementInTracks();
	// 	// 		if (!indeces) {
	// 	// 			return;
	// 	// 		}
	// 	// 		const firstIndex = indeces[0];
	// 	// 		const secondIndex = indeces[1];
	// 	// 		timelineTracks.update(
	// 	// 			(tracks) => {
	// 	// 				const track = tracks[firstIndex];
	// 	// 				const newEl = track.elements[secondIndex];
	// 	// 				const obj: ITimelineElement = {
	// 	// 					...newEl
	// 	// 					// playbackStartTime: scrolledPxInSeconds
	// 	// 				};
	// 	// 				track.elements[secondIndex] = obj;
	// 	// 				tracks[firstIndex] = track;
	// 	// 				console.log('onElementDrag -> tracks after mapping:', tracks);
	// 	// 				return tracks;
	// 	// 			}
	// 	// 			// tracks.map(
	// 	// 			// (track) => track.elements.map((el) => el)
	// 	// 			// track.elements.map((el) => {
	// 	// 			// 	if (el.elementId === element.elementId) {
	// 	// 			// 		return {
	// 	// 			// 			...el,
	// 	// 			// 			playbackStartTime: newPos
	// 	// 			// 		};
	// 	// 			// 	}
	// 	// 			// 	return el;
	// 	// 			// })
	// 	// 			// )
	// 	// 		);
	// 	// 		if (!$isTimelineElementBeingDragged) {
	// 	// 			$isTimelineElementBeingDragged = true;
	// 	// 			console.log('isTimelineElementBeingDragged?:', $isTimelineElementBeingDragged);
	// 	// 		}
	// 	// 	}
	// 	// }
	// }
	//#endregion
</script>

<!-- <div
	class="clone h-[50px] mr-5 rounded hover:cursor-pointer absolute z-20"
	style="width: {elementWidth}px; background-color: blue; display: {dragging
		? 'unset'
		: 'none'}; left: {clonePositionLeft}; top: {clonePositionTop};"
	on:mousemove={onElementDrag}
	on:mouseup={onElementDrop}
	bind:this={cloneRef}
></div> -->

<!-- <div
	class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed z-10"
	style="width: {elementWidth}px; display: {elementHoveredOverRow && $isTimelineElementBeingDragged
		? 'unset'
		: 'none'}; background-color: green; transform: translate3d({dropZonePositionLeft}px, 0, 0);"
></div> -->

<!-- <div
	class="timeline-row-element h-[50px] mr-5 rounded hover:cursor-pointer absolute"
	style="width: {elementWidth}px; background-color: {isSelected
		? tailwindColors.orange[500]
		: tailwindColors.red[500]}; transform: translate3d({leftOffset}px, 0, 0); display: {dragging
		? 'none'
		: 'unset'}"
	on:mousedown={onElementClick}
	on:pointermove={onPointerMove}
	on:dragend={onElementDrop}
	on:mousemove={onElementDrag}
	bind:this={elementRef}
></div> -->

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
	on:neodrag:start={testStart}
	on:neodrag={test}
	on:neodrag:end={testEnd}
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
		index:{elementIndex}
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

<!-- TODO: old one that worked mostly -->
<!-- <div
	class="timeline-row-element h-[50px] mr-5 rounded hover:cursor-pointer absolute"
	style="width: {elementWidth}px; background-color: {isSelected
		? tailwindColors.orange[500]
		: tailwindColors.red[500]}; z-index: {dragging ? '50' : 'auto'}"
	use:draggable={{ position: { x: leftOffset, y: topOffset } }}
	on:mousedown={getMousePosition}
	on:neodrag:start={testStart}
	on:neodrag={test}
	on:neodrag:end={testEnd}
	bind:this={elementRef}
></div> -->

<!-- <div
	draggable="true"
	class="timeline-row-element h-[50px] mr-5 rounded hover:cursor-pointer"
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
></div> -->

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
