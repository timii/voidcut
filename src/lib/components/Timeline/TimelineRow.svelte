<script lang="ts">
	import type {
		ITimelineDraggedElementPosition,
		ITimelineElementBounds,
		ITimelineTrack
	} from '$lib/interfaces/Timeline';
	import { onMount } from 'svelte';
	import {
		currentTimelineScale,
		draggedElementData,
		draggedElementPosition,
		isTimelineElementBeingDragged,
		thumbOffset,
		timelineTracks
	} from '../../../stores/store';
	import TimelineRowElement from './TimelineRowElement.svelte';
	import { CONSTS } from '$lib/utils/consts';
	import {
		cleanUpEmptyTracks,
		convertMsToPx,
		convertPxToMs,
		handleTimelineMediaDrop,
		isElementAtCorrectIndex,
		isElementOverlapping,
		moveElementsOnTrack,
		moveElementToCorrectIndex
	} from '$lib/utils/utils';
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

		// listen to event when a timeline element is dropped
		window.addEventListener(CONSTS.customEventNameDropTimelineElement, () => {
			console.log(
				`${CONSTS.customEventNameDropTimelineElement} event triggered in row -> elementHoveredOverRow:`,
				elementHoveredOverRow
			);

			// if no data for the dragged element is defined or no element is hovered over the row we just return
			if (!$draggedElementData || !$draggedElementPosition || !elementHoveredOverRow) return;

			const draggedData = $draggedElementData;
			const draggedPosition = $draggedElementPosition;

			// get position of dropped element along the x axis
			const xWithoutOffset = draggedPosition.left - CONSTS.timelineRowOffset;
			const x = xWithoutOffset < CONSTS.timelineRowOffset ? 0 : xWithoutOffset;
			const elementEnd = x + draggedData.width;
			const elementId = draggedData.elementId;

			// convert the dragged element bounds from px into ms
			const elBoundsInMs: ITimelineElementBounds = {
				start: convertPxToMs(x),
				end: convertPxToMs(elementEnd)
			};

			console.log(
				'Timeline -> row drop-timeline-element -> dropped element on the x axis:',
				x,
				'elementEnd:',
				elementEnd,
				'elBoundsInMs:',
				elBoundsInMs
			);

			// move timeline element to correct position in the row
			// TODO: move other elements if necessary
			// TODO: fix logic when dropping an element onto the row and index it correctly
			// currently when dropping an element before another one the dropped element just gets appended
			timelineTracks.update((tracks) => {
				// get the previous track and element index of dragged element
				const prevTrackIndex = draggedData.prevTrackIndex;
				const prevElementIndex = draggedData.prevElementIndex;

				console.log(
					'Timeline -> element dropped on track -> after while old element index:',
					prevElementIndex,
					'old trackIndex:',
					prevTrackIndex,
					'new track index:',
					index,
					'tracks:',
					tracks
				);

				// if the previous track and element index are not defined we directly return the tracks
				// TODO: check if we even need this
				// if (prevElementIndex === -1 || prevTrackIndex === -1) {
				// 	return tracks;
				// }

				// get the dragged element from the previous track
				const foundEl = tracks[prevTrackIndex].elements[prevElementIndex];

				const copy: any = Object.assign({}, foundEl);
				delete copy.mediaImage;

				console.log(
					'Timeline -> element dropped on track -> after while foundEl:',
					copy,
					'trackIndex:',
					prevTrackIndex,
					'moved in the same track:',
					draggedData.prevTrackIndex === index
				);

				// TODO: refactor this whole thing into util functions
				// - 1. check if the dropped element was on the same track before or not
				// 2. element came from the same track
				// 		2.1 change playbackStartTime
				// 		2.2 OPTIONAL: if elements overlap: move elements on track accordingly
				// 3. element came from a different track
				// 		3.1 remove element from previous track
				// 		3.2 move element onto current track
				// 		3.3 OPTIONAL: if elements overlap: move elements on new track accordingly

				// element was moved in the same track
				if (draggedData.prevTrackIndex === index) {
					// check if the new position of the element overlaps with any other element on the track
					const isOverlapping = isElementOverlapping(
						elBoundsInMs,
						tracks[index].elements,
						prevElementIndex // we ignore the index of the dragged element so we don't check if the element overlaps with itself
					);

					console.error('Timeline -> row drop-timeline-element -> isOverlapping:', isOverlapping);

					// if the element overlaps with any other element we move the elements accordingly so the element can fit on the track
					if (isOverlapping) {
						tracks[index].elements = moveElementsOnTrack(
							elBoundsInMs,
							tracks[index].elements,
							prevElementIndex
						);
						console.error(
							'Timeline -> row drop-timeline-element -> elements overlaps after track:',
							[...tracks[index].elements]
						);
					}

					// update the playback start time for the moved element
					foundEl.playbackStartTime = elBoundsInMs.start;

					// check if the index of the element inside the track is still correct after changing the playbackStartTime, if not we need to update it
					if (!isElementAtCorrectIndex(foundEl, prevElementIndex, tracks[index].elements)) {
						console.error(
							'Timeline -> row drop-timeline-element -> element is not at the correct index anymore -> track:',
							[...tracks[index].elements],
							'foundEl',
							Object.assign({}, foundEl),
							'prevElementIndex:',
							prevElementIndex
						);
						//  update the element index inside the track
						const updatedTrack = moveElementToCorrectIndex(
							foundEl,
							prevElementIndex,
							tracks[index].elements
						);

						// overwrite the current track with the updated track
						tracks[index].elements = updatedTrack;
					}
				}
				// element was dragged onto a different track
				else {
					// remove dragged element from old track
					tracks[prevTrackIndex].elements.splice(prevElementIndex, 1);
					console.log(
						'Timeline -> element dropped on track -> tracks after element removed from track:',
						JSON.parse(JSON.stringify(tracks))
					);

					// console.log(
					// 	'element dropped on track -> tracks checking if overlapping:',
					// 	isOverlapping,
					// 	'xInMs',
					// 	xInMs,
					// 	'foundEl:',
					// 	foundEl,
					// 	'new track:',
					// 	JSON.parse(JSON.stringify(tracks[index]))
					// );

					// check if the new position of the element overlaps with any other element on the track
					const isOverlapping = isElementOverlapping(
						elBoundsInMs,
						tracks[index].elements,
						undefined // we don't need to check any previous index here since the new element has not yet been added to the track
					);

					console.error(
						'Timeline -> element dropped on track -> row drop-timeline-element -> isOverlapping:',
						isOverlapping
					);

					// if the element overlaps with any other element we move the elements accordingly so the element can fit on the track
					if (isOverlapping) {
						tracks[index].elements = moveElementsOnTrack(
							elBoundsInMs,
							tracks[index].elements,
							undefined // we also set this to be undefined since the element was dragged from a different track
						);
						console.error(
							'Timeline -> element dropped on track -> row drop-timeline-element -> elements overlaps after track:',
							[...tracks[index].elements]
						);
					}

					// update the playback start time for the moved element
					foundEl.playbackStartTime = elBoundsInMs.start;

					// add element with updated playbackStartTime into new track
					tracks[index].elements.push(foundEl);

					// since we just pushed the new element to the end of the track elements we need to check if the index of the element inside the track is correct, if not we need to update it
					if (
						!isElementAtCorrectIndex(
							foundEl,
							tracks[index].elements.length - 1, // use the last index in the current track since we added the element into the end of the array
							tracks[index].elements
						)
					) {
						console.error(
							'Timeline -> element dropped on track -> row drop-timeline-element -> element is not at the correct index -> track:',
							[...tracks[index].elements],
							'foundEl',
							Object.assign({}, foundEl),
							'tracks[index].elements.length - 1:',
							tracks[index].elements.length - 1
						);
						//  update the element index inside the track
						const updatedTrack = moveElementToCorrectIndex(
							foundEl,
							tracks[index].elements.length - 1, // also use the last element index here as well
							tracks[index].elements
						);

						// overwrite the current track with the updated track
						tracks[index].elements = updatedTrack;
					}

					// clean up old track if its empty now
					cleanUpEmptyTracks(tracks);
					console.log(
						'element dropped on track -> tracks after empty track is removed:',
						JSON.parse(JSON.stringify(tracks))
					);
				}

				// TODO: check track index of dragged element and if its the same as the current row just change the playback start time, else we also need to remove it from the current row and move it into the new one with the updated playback start time

				// convert the x value from px into ms
				// const xInMs = convertPxToMs(x);
				// const foundElEnd = xInMs + foundEl.duration;
				// const elBounds: ITimelineElementBounds = { start: xInMs, end: foundElEnd };
				// const sameTrackMoveElIndex = index !== prevTrackIndex ? undefined : prevElementIndex;

				// // check if the dropped element overlaps with any element on the track
				// const isOverlapping = isElementOverlapping(
				// 	elBounds,
				// 	tracks[index].elements,
				// 	sameTrackMoveElIndex // if the element is dropped on the same track we ignore the dragged element index in the track
				// );

				// // if the dropped element overlaps any other element we move the elements accordingly so the element can fit on the track
				// if (isOverlapping) {
				// 	tracks[index].elements = moveElementsOnTrack(
				// 		elBounds,
				// 		tracks[index].elements,
				// 		sameTrackMoveElIndex
				// 	);
				// }

				// // set the new playback start time (in ms)
				// foundEl.playbackStartTime = xInMs;
				// console.log(
				// 	'element dropped on track after new playbacktime set -> foundEl:',
				// 	foundEl,
				// 	'x in ms:',
				// 	xInMs,
				// 	'isOverlapping:',
				// 	isOverlapping,
				// 	'elementIndexInTrack:',
				// 	elementIndexInTrack
				// );

				// if the element is moved to a different track
				// if (index !== prevTrackIndex) {
				// 	// remove dragged element from old track
				// 	tracks[prevTrackIndex].elements.splice(prevElementIndex, 1);
				// 	console.log(
				// 		'element dropped on track -> tracks after element removed from track:',
				// 		JSON.parse(JSON.stringify(tracks))
				// 	);

				// 	// console.log(
				// 	// 	'element dropped on track -> tracks checking if overlapping:',
				// 	// 	isOverlapping,
				// 	// 	'xInMs',
				// 	// 	xInMs,
				// 	// 	'foundEl:',
				// 	// 	foundEl,
				// 	// 	'new track:',
				// 	// 	JSON.parse(JSON.stringify(tracks[index]))
				// 	// );

				// 	// add element into new track
				// 	// TODO: we need to not just push the element onto the new track but also check at which index we need to add it at
				// 	tracks[index].elements.push(foundEl);
				// 	console.log(
				// 		'element dropped on track -> tracks after element added to new track:',
				// 		JSON.parse(JSON.stringify(tracks))
				// 	);

				// 	// clean up old track if its empty now
				// 	cleanUpEmptyTracks(tracks);
				// 	console.log(
				// 		'element dropped on track -> tracks after empty track is removed:',
				// 		JSON.parse(JSON.stringify(tracks))
				// 	);
				// }
				// if the element is dropped on the same track
				// TODO: remove if not necessary anymore
				// else {
				// }

				console.error(
					'Timeline -> row drop-timeline-element -> just before returning tracks -> tracks:',
					[...tracks]
				);
				return tracks;
			});
		});
	});

	// TODO: refactor to be a util function (including the function in the divider)
	// check if element is currently hovered over row
	function isElementHovered(draggedEl: ITimelineDraggedElementPosition | null) {
		if (!draggedEl || !$draggedElementData || !rowRef) return;

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
			// TODO: move the hardcoded value into a const
			// limit the drop zone offset to the left so it doesnt' further left than the track
			dropZonePositionLeft = Math.max(draggedEl.left, CONSTS.timelineRowOffset);

			if (elementWidth === 0) {
				// calculate element width using the dragged element width
				elementWidth = $draggedElementData.width;
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
		const duration = mediaData.duration;

		if (!duration) {
			return;
		}

		// only handle files when actually dropped
		if (!mediaData || e.type === 'dragleave') {
			return;
		}

		// timelineTracks.update((tracks) => {
		// 	tracks[index].elements.push;

		// 	return tracks;
		// });
		console.log('drop element -> left:', dropZonePositionLeft, dropZonePositionLeft - $thumbOffset);
		const startTimeInPx = dropZonePositionLeft - $thumbOffset;
		const startTimeInMs = (startTimeInPx / $currentTimelineScale) * 1000;
		// TODO: make second index dynamic
		handleTimelineMediaDrop(mediaData, index, 1, startTimeInMs);

		// handleTimelineMediaDrop(mediaData, index);
	}
</script>

<div
	class="timeline-row bg-ruler-color h-[50px] w-full mr-5 rounded flex"
	style="background-color: {hoverElement ? 'red' : '#42424e'}"
	data-row-index={index}
	on:drop={onDropElement}
	on:dragleave={onDropElement}
	on:dragenter={onHoverElement}
	on:dragover={onHoverElement}
	bind:this={rowRef}
>
	<!-- <div
		class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed z-10"
		style="width: {elementWidth}px; display: {elementHoveredOverRow &&
		$isTimelineElementBeingDragged
			? 'unset'
			: 'none'}; background-color: green; transform: translate3d({dropZonePositionLeft}px, 0, 0);"
	></div> -->

	<!-- element that is shown when a media pool element is being dragged -->
	<div
		class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed z-10 absolute"
		style="width: {dropZoneWidth}px; display: {hoverElement
			? 'unset'
			: 'none'}; background-color: green; left: {dropZonePositionLeft}px;"
	></div>

	<!-- element that is shown when an timeline element is being dragged -->
	<div
		class="clone-drop-zone h-[50px] mr-5 rounded outline-dashed z-10 absolute"
		style="width: {elementWidth}px; display: {elementHoveredOverRow &&
		$isTimelineElementBeingDragged
			? 'unset'
			: 'none'}; background-color: green; left: {dropZonePositionLeft}px;"
	></div>
	<!-- use the elementId of each element as the unqiue key to use when the data changes -->
	{#each track.elements as element, elementIndex (element.elementId)}
		<TimelineRowElement {element} {elementIndex} rowIndex={index}></TimelineRowElement>
	{/each}
</div>
