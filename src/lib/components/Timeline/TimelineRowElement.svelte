<script lang="ts">
	import type {
		ITimelineDraggedElement,
		ITimelineDraggedElementPosition,
		ITimelineElement
	} from '$lib/interfaces/Timeline';
	import { CONSTS } from '$lib/utils/consts';
	import { getRelativeMousePosition, getTailwindVariables } from '$lib/utils/utils';
	import { onMount } from 'svelte';
	import {
		currentTimelineScale,
		draggedElement,
		draggedElementData,
		draggedElementPosition,
		isThumbBeingDragged,
		isTimelineElementBeingDragged,
		selectedElement,
		thumbOffset
	} from '../../../stores/store';
	import { draggable } from '@neodrag/svelte';
	import type { DragEventData } from '@neodrag/svelte';

	export let element: ITimelineElement = {} as ITimelineElement;
	export let index: number;

	$: isSelected = getSelectedElement($selectedElement);

	// dynamically calculate left offset of element
	$: leftOffset = (element.playbackStartTime / CONSTS.secondsMultiplier) * $currentTimelineScale;
	// set the left offset once in the beginning
	leftOffset = (element.playbackStartTime / CONSTS.secondsMultiplier) * $currentTimelineScale;

	// the offset of the element within the parent
	let topOffset = 0;

	let position = { x: leftOffset, y: topOffset };

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
		(element.duration / CONSTS.secondsMultiplier) * $currentTimelineScale,
		'leftOffset:',
		leftOffset
	);

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
	// let isSelected = false;
	// let dropZonePositionLeft = 0;
	// let elementHoveredOverRow = false;

	onMount(() => {
		window.addEventListener('dragover', (e: DragEvent) => {
			if ($isTimelineElementBeingDragged) {
				e.preventDefault();
				e.stopPropagation();
				console.log('event listener on window while dragging');
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

	// get the starting mouse position when starting the dragging movement
	function getMousePosition(e: MouseEvent) {
		console.log('getMousePosition -> e:', e);
		if (!mouseStartPosition && !$isThumbBeingDragged) {
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
			data: element
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

		// reset all variables to intial values
		dragging = false;
		isTimelineElementBeingDragged.set(false);
		mouseStartPosition = undefined;
		elStartPosition = undefined;

		// reset topOffset so the timeline element gets placed inside a track again
		setTimeout(() => {
			topOffset = 0;
			// manually trigger update of the left offset so the new offset is actually updated
			leftOffset = (element.playbackStartTime / CONSTS.secondsMultiplier) * $currentTimelineScale;

			position = { x: leftOffset, y: topOffset };
			console.log(
				'element dropped on divider in testEnd -> topOffset reset:',
				position,
				'element.playbackStartTime:',
				element.playbackStartTime,
				'(element.playbackStartTime / CONSTS.secondsMultiplier) * $currentTimelineScale:',
				(element.playbackStartTime / CONSTS.secondsMultiplier) * $currentTimelineScale
			);
		}, 0);

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
	class="timeline-row-element h-[50px] mr-5 rounded hover:cursor-pointer absolute"
	style="width: {elementWidth}px; background-color: {isSelected
		? tailwindColors.orange[500]
		: tailwindColors.red[500]}; z-index: {dragging ? '50' : 'auto'}"
	data-element-index={index}
	data-element-offset={element.playbackStartTime}
	data-element-id={element.elementId}
	use:draggable={{ position }}
	on:mousedown={getMousePosition}
	on:neodrag:start={testStart}
	on:neodrag={test}
	on:neodrag:end={testEnd}
	bind:this={elementRef}
>
	<div class="timeline-row-element-name text-[12px] text-background-color-light ml-1 truncate">
		{element.mediaName}
	</div>
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
