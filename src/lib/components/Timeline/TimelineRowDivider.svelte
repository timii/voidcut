<script lang="ts">
	import type { ITimelineDraggedElement, ITimelineTrack } from '$lib/interfaces/Timeline';
	import { onMount } from 'svelte';
	import {
		draggedElement,
		isTimelineElementBeingDragged,
		timelineTracks
	} from '../../../stores/store';
	import colors from 'tailwindcss/colors';
	import { CONSTS } from '$lib/utils/consts';
	import {
		cleanUpEmptyTracks,
		createTrackWithElement,
		handleTimelineMediaDrop
	} from '$lib/utils/utils';
	import type { IMedia } from '$lib/interfaces/Media';

	export let index: number;

	// call function everytime the store variable changes
	$: isElementHovered($draggedElement);

	let dividerRef: HTMLElement;
	let tracksElBoundRect: DOMRect;
	let dividerElBoundRect: DOMRect;
	let offsetInParent: { left: number; top: number };
	let elementOverDivider = false;
	let hoverElement = false;

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

			if (!$draggedElement) return;

			const elementId = $draggedElement.elementId;
			const elementData = $draggedElement.data;

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

				// add new track
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

	function onHoverElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverElement = true;
	}

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
		if (mediaData && e.type !== 'dragleave') {
			handleTimelineMediaDrop(mediaData, index);
		}
	}
</script>

<div
	class="track-divider w-ful h-[4px] rounded-sm"
	style="background-color: {(elementOverDivider && $isTimelineElementBeingDragged) || hoverElement
		? 'red'
		: colors.slate[500]}"
	on:drop={onDropElement}
	on:dragleave={onDropElement}
	on:dragenter={onHoverElement}
	on:dragover={onHoverElement}
	bind:this={dividerRef}
></div>
