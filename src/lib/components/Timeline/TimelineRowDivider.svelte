<script lang="ts">
	import { TimelineDropArea, type ITimelineDraggedElementPosition } from '$lib/interfaces/Timeline';
	import { onMount } from 'svelte';
	import {
		draggedElementData,
		draggedElementPosition,
		draggedOverFirstDivider,
		draggedUnderLastDivider,
		isTimelineElementBeingDragged,
		timelineTracks
	} from '../../../stores/store';
	import { CONSTS } from '$lib/utils/consts';
	import {
		cleanUpEmptyTracks,
		createTrackWithElement,
		handleTimelineMediaDrop,
		resetOverUnderDividers
	} from '$lib/utils/utils';
	import type { IMedia } from '$lib/interfaces/Media';

	export let index: number;

	// call function everytime the store variable changes
	$: isElementHovered($draggedElementPosition);

	// check if divider needs to be highlighted if one of those two store values changes
	$: isDraggedElementOverOrUnder($draggedOverFirstDivider, $draggedUnderLastDivider);

	let dividerRef: HTMLElement;
	let tracksElBoundRect: DOMRect;
	let dividerElBoundRect: DOMRect;
	let offsetInParent: { left: number; top: number };
	let elementOverDivider = false;
	let hoverElement = false;
	let hoverElementOverUnder = false;

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

			if (!elementOverDivider) return;

			if (!$draggedElementData) return;

			const elementId = $draggedElementData.elementId;
			const elementData = $draggedElementData.data;

			console.log(
				'element dropped on divider -> draggedElementData:',
				$draggedElementData,
				'elementData:',
				elementData
			);

			timelineTracks.update((tracks) => {
				// find dragged element index using the element id
				let elementIndexInTrack = -1;
				let trackIndex = 0;
				while (elementIndexInTrack === -1 && trackIndex < tracks.length) {
					console.log(
						'element dropped on divider -> in while tracks:',
						JSON.parse(JSON.stringify(tracks)),
						'trackIndex:',
						trackIndex
					);
					elementIndexInTrack = tracks[trackIndex].elements.findIndex(
						(el) => el.elementId === elementId
					);
					if (elementIndexInTrack === -1) {
						trackIndex++;
					}
				}

				// TODO: fix behavior when two elements on one track and trying to move first element onto a divider

				// if the dragged element is in the same track as the track it got dragged from -> don't change any tracks
				if (elementIndexInTrack === -1) {
					return tracks;
				}

				const dividerAdjacentToTrack = index === trackIndex || index === trackIndex + 1;

				console.log(
					'element dropped on divider -> track index:',
					trackIndex,
					'foundElIndex:',
					elementIndexInTrack,
					'divider index:',
					index,
					'divider adjacent to track:',
					index === trackIndex || index === trackIndex + 1,
					'tracks before:',
					JSON.parse(JSON.stringify(tracks))
				);

				// create new track and add dragged element into it
				const track = createTrackWithElement(elementData);

				// remove dragged element from track
				tracks[trackIndex].elements.splice(elementIndexInTrack, 1);
				console.log(
					'element dropped on divider -> tracks after element removed from track:',
					JSON.parse(JSON.stringify(tracks))
				);

				// TODO: check for array bounds

				// add new track that includes the dragged element
				tracks.splice(index, 0, track);
				console.log(
					'element dropped on divider -> tracks after new track has been added:',
					JSON.parse(JSON.stringify(tracks))
				);

				// clean up old track if its empty now
				cleanUpEmptyTracks(tracks);
				console.log(
					'element dropped on divider -> tracks after empty track is removed:',
					JSON.parse(JSON.stringify(tracks))
				);

				return tracks;
			});
		});
	});

	// check if a timeline element is hovered over the divider
	function isElementHovered(draggedEl: ITimelineDraggedElementPosition | null) {
		if (!draggedEl || !offsetInParent) return;

		// current mouse position on the y axis
		// TODO: refactor into util function
		const curYPos = draggedEl.clickedY;
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

	function onHoverElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverElement = true;
		resetOverUnderDividers();
	}

	// handle media element dropped on divider and not timeline element
	function onDropElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverElement = false;

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

		handleTimelineMediaDrop(mediaData, TimelineDropArea.DIVIDER, index);
	}

	function onScroll(e: Event) {
		e.preventDefault;
	}

	function isDraggedElementOverOrUnder(over: boolean, under: boolean) {
		console.log(
			'on hover isDraggedElementOverOrUnder -> over/under',
			over,
			'/',
			under,
			'index:',
			index,
			'$timelineTracks.length:',
			$timelineTracks.length
		);

		// if current divider is the first one and the dragged element is over the first
		const overCurrent = over && index === 0;
		// if current divider is the last one and the dragged element is under the last
		const underCurrent = under && index === $timelineTracks.length;
		// if the dragged element is neither over nor under the first/last divider
		const notOverAndUnder = !over && !under;

		// highlight current divider if dragged element is either over current or under current element
		hoverElementOverUnder = !notOverAndUnder && (overCurrent || underCurrent);

		console.log(
			'on hover isDraggedElementOverOrUnder -> hoverElementOverUnder:',
			hoverElementOverUnder
		);
		console.log('-------------------');
	}
</script>

<div
	class="track-divider w-full h-[12px] flex flex-col justify-center"
	data-divider-index={index}
	on:drop={onDropElement}
	on:dragleave={onDropElement}
	on:dragenter={onHoverElement}
	on:dragover={onHoverElement}
	on:wheel={onScroll}
	bind:this={dividerRef}
>
	<div
		class="track-divider-highlight h-[4px] rounded bg-background-timeline-row-element-hover"
		style="
		opacity: 
		{(elementOverDivider && $isTimelineElementBeingDragged) || hoverElement || hoverElementOverUnder
			? '1'
			: '0'};"
	></div>
</div>
