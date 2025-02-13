<script lang="ts">
	import type { IMedia } from '$lib/interfaces/Media';
	import {
		allBoundingRectValuesZero,
		convertMsToPx,
		handleElementResizing,
		handleTimelineMediaDrop,
		hasHorizontalScrollbar,
		hasVerticalScrollbar,
		moveTimelineThumb,
		onlyPrimaryButtonClicked,
		resetAllBeingDragged,
		resetOverUnderDividers
	} from '$lib/utils/utils';
	import { onMount } from 'svelte';
	import TimelineRow from './TimelineRow.svelte';
	import TimelineRuler from './TimelineRuler.svelte';
	import TimelineThumb from './TimelineThumb.svelte';
	import {
		currentPlaybackTime,
		currentThumbPosition,
		currentTimelineScale,
		draggedElementData,
		draggedElementPosition,
		draggedOverFirstDivider,
		draggedOverThreshold,
		draggedUnderLastDivider,
		horizontalScroll,
		isThumbBeingDragged,
		isTimelineElementBeingDragged,
		isTimelineElementBeingResized,
		maxPlaybackTime,
		maxTimelineScale,
		minTimelineScale,
		possibleScaleValues,
		startAmountOfTicks,
		thumbOffset,
		timelineTracks,
		verticalScroll
	} from '../../../stores/store';
	import {
		TimelineDropArea,
		type ITimelineDraggedElementPosition,
		type ITimelineTrack
	} from '$lib/interfaces/Timeline';
	import TimelineControls from './TimelineControls.svelte';
	import { CONSTS } from '$lib/utils/consts';
	import TimelineRowDivider from './TimelineRowDivider.svelte';
	import TimelineEmpty from './TimelineEmpty.svelte';
	import { dropTimelineElementHandler } from '$lib/utils/drop-timeline-element-handler.utils';

	let scrollContainerEl: HTMLDivElement;
	let isOverflowingX = false;
	let isOverflowingY = false;
	let amountOfTicks = 0;
	let amountOfTicksRounded = 0;
	let thumbElementRef: HTMLElement | null = null;
	let firstDivider: Element | null = null;
	let lastDivider: Element | null = null;

	onMount(() => {
		// listen to selected events in the window
		const events = ['mouseup', 'dragend'];
		events.forEach((e) => {
			window.addEventListener(e, () => {
				// delay resetting the store values to workaround when mouse down event fires after mouse button isn't held down anymore
				setTimeout(() => {
					resetAllBeingDragged();
					console.log(e + ' mouseup');
				}, CONSTS.resetDelay);
			});
		});

		// calculate the range of possible scale values we can have and write it into the store
		const min = $minTimelineScale;
		const max = $maxTimelineScale;
		let values: number[] = [];
		let i = min;
		while (i <= max) {
			values.push(i);
			i = i * 2;
		}
		possibleScaleValues.set(values);
		console.log('fit on mount -> values:', values);

		// TODO: change that so check both scrollbars everytime something in the timeline changes and/or screen sitze changes
		isOverflowingY = hasVerticalScrollbar(scrollContainerEl);
		isOverflowingX = hasHorizontalScrollbar(scrollContainerEl);

		// get current width of timeline to calculate max playback time at the start
		amountOfTicks = scrollContainerEl.scrollWidth / $currentTimelineScale;
		amountOfTicksRounded = Math.ceil(amountOfTicks);

		// set amount of ticks at the start
		startAmountOfTicks.set(amountOfTicksRounded);
		console.log(
			'timeline width -> clientWidth:',
			scrollContainerEl.clientWidth,
			'scrollWidth:',
			scrollContainerEl.scrollWidth,
			'offsetWidth:',
			scrollContainerEl.offsetWidth,
			'thumbOffset:',
			$thumbOffset,
			'amount of ticks in the timeline possible:',
			amountOfTicks,
			'rounded up:',
			amountOfTicksRounded
		);
		// TODO: check the timeline width everytime something in the timeline changes

		console.log(
			'onMount -> scrollContainerEl:',
			scrollContainerEl,
			'overflowY?:',
			isOverflowingY,
			'overflowX?:',
			isOverflowingX
		);

		// listen to event when a timeline element is dropped
		window.addEventListener(CONSTS.customEventNameDropTimelineElement, (e) =>
			dropTimelineElementHandler(e as CustomEvent)
		);
	});

	// get the max playback time everytime the timelineTracks store changes
	$: getMaxPlaybackTime($timelineTracks);

	$: resetStoreValues($isTimelineElementBeingDragged);

	// check if the dragged element is hovered over the timeline
	$: isElementHovered($draggedElementPosition);

	// TODO: refactor to be a util function (including the function in the divider)
	// check if timeline element is currently hovered over row
	function isElementHovered(draggedEl: ITimelineDraggedElementPosition | null) {
		if (
			!draggedEl ||
			!$draggedElementData ||
			!$draggedOverThreshold ||
			!$isTimelineElementBeingDragged
		)
			return;

		const parentTopOffset = scrollContainerEl.getBoundingClientRect();

		// current dragged position on the y axis (including the parent top offset and ruler height)
		const curYPos = draggedEl.clickedY + parentTopOffset.top + 26;

		// update local variables if they're null
		updateFirstAndLastDividerIfNull();

		// check if given y coordinate is lower or higher than first/last divider and update store
		isYHigherOrLowerThanDividers(curYPos);
	}

	function getMaxPlaybackTime(tracks: ITimelineTrack[]) {
		console.log(
			'Timeline -> timelineTracks changed:',
			$timelineTracks,
			'first track elements:',
			$timelineTracks.length > 0 ? $timelineTracks[0].elements : []
		);

		// go through each row and element and check what the last playback time is
		if (tracks.length > 0) {
			let maxTime = 0;
			tracks.forEach((track) => {
				console.log('getMaxPlaybackTime -> track:', track);
				track.elements.forEach((element) => {
					// add element offset and duration to get the time the element ends
					const endTime = element.playbackStartTime + element.duration;
					if (endTime > maxTime) {
						maxTime = endTime;
					}
					console.log('getMaxPlaybackTime -> element:', element, 'endTime:', endTime);
				});
			});
			maxPlaybackTime.set(maxTime);

			// update timeline ruler ticks amount to scale it with the increased timeline width
			// but only if the new amount of ticks is equal or more to the start amount
			const maxTimeAsTicks = Math.ceil(maxTime / CONSTS.secondsMultiplier);
			if (maxTimeAsTicks >= $startAmountOfTicks) {
				console.log('getMaxPlaybackTime in if');
				amountOfTicksRounded = maxTimeAsTicks;
			} else {
				// if the max time is smaller than the starting amount of ticks set it back to the starting value to avoid timeline ruler being short than screen
				amountOfTicksRounded = $startAmountOfTicks;
			}
			console.log(
				'getMaxPlaybackTime -> after all for each maxTime:',
				maxTime,
				'amountOfTicksRounded:',
				amountOfTicksRounded,
				'startAmountOfTicks:',
				$startAmountOfTicks,
				'amountOfTicksRounded >= $startAmountOfTicks:',
				amountOfTicksRounded >= $startAmountOfTicks
			);
		} else {
			// if the array is empty -> reset maxPlaybackTime
			maxPlaybackTime.set(0);
		}
	}

	// reset store values if isTimelineElementBeingDragged changed to false
	function resetStoreValues(elementBeingDragged: boolean) {
		if (!elementBeingDragged) {
			draggedOverFirstDivider.set(false);
			draggedUnderLastDivider.set(false);
		}
	}

	function onDropElement(e: DragEvent) {
		// TODO: refactor most of this logic into a util function since we mostly do the same for both dropping media element here, divider and the timelineRow
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();

		// reset all the variables used when checking if dragged element is over or under dividers
		resetOverUnderDividers();
		firstDivider = null;
		lastDivider = null;

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

		// check if the element was dropped over the first or under the last divider
		const rowIndex = $draggedOverFirstDivider ? 0 : $timelineTracks.length;

		handleTimelineMediaDrop(mediaData, TimelineDropArea.DIVIDER, rowIndex);
	}

	// update local variables if they're null
	function updateFirstAndLastDividerIfNull() {
		let dividers;

		if (!firstDivider || !lastDivider) {
		if (
			!firstDivider ||
			allBoundingRectValuesZero(firstDivider) ||
			!lastDivider ||
			allBoundingRectValuesZero(lastDivider)
		) {
			// get all divider elements using their class
			dividers = document.getElementsByClassName('track-divider');

			// if we found less than two dividers something went wrong
			if (dividers.length < 2) {
				return;
			}

			// get the first and last one from list of dividers
			firstDivider = dividers[0];
			lastDivider = dividers[dividers.length - 1];
		}
	}

	// check if given y coordinate is lower or higher than first/last divider and update store
	function isYHigherOrLowerThanDividers(y: number) {
		if (!firstDivider || !lastDivider) {
			return;
		}

		// get their y coordinates
		const firstRect = firstDivider.getBoundingClientRect();
		const lastRect = lastDivider.getBoundingClientRect();

		// check if we're higher than the first or lower than the last divider
		const higher = y < firstRect.y;
		const lower = y > lastRect.y + lastRect.height;

		// only update store values if they changed compared to the current state
		if (higher !== $draggedOverFirstDivider) {
			draggedOverFirstDivider.set(higher);
		}
		if (lower !== $draggedUnderLastDivider) {
			draggedUnderLastDivider.set(lower);
		}

		console.log(
			'on hover isYHigherOrLowerThanDividers -> firstRect/lastRect:',
			firstRect,
			'/',
			lastRect,
			'y:',
			y,
			'higher/lower:',
			higher,
			'/',
			lower
		);
	}

	function onHoverElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();

		// update local variables if they're null
		updateFirstAndLastDividerIfNull();

		// check if given y coordinate is lower or higher than first/last divider and update store
		isYHigherOrLowerThanDividers(e.clientY);
	}

	// listen to scrolling in the timeline
	function onTimelineScroll(e: Event) {
		if (thumbElementRef === null) {
			thumbElementRef = document.getElementById('timeline-thumb');
		}

		if (!e.currentTarget) {
			return;
		}

		const target = e.currentTarget as HTMLElement;
		const horizontalScrollValue = target.scrollLeft;
		const verticalScrollValue = target.scrollTop;
		$horizontalScroll = horizontalScrollValue;
		$verticalScroll = verticalScrollValue;

		const thumbBoundingRect = thumbElementRef?.getBoundingClientRect();
		if (!thumbBoundingRect) {
			return;
		}

		// if the thumbs x position is smaller than 0 it is out of the view and we clamp the thumb to the left side
		// if (thumbBoundingRect.x < 0) {
		// 	// subtract 16 from the scrol position to have no padding on the left side of the thumb
		// 	currentThumbPosition.set(horizontalScrollValue - 16);
		// }

		// // if the thumbs x position is bigger than the width of the timeline (- the width of the timeline) we clamp it to the right side
		// if (thumbBoundingRect.x > scrollContainerEl.clientWidth - 12) {
		// 	// new thumb position is the amount scrolled + the width of the timeline (- the width of the thumb + left padding)
		// 	currentThumbPosition.set(horizontalScrollValue + scrollContainerEl.clientWidth - 28);
		// }

		// subtract the horizontal scroll of current playback when scrolling to keep the thumb at the same time
		currentThumbPosition.set(convertMsToPx($currentPlaybackTime) - horizontalScrollValue);

		console.log(
			'timeline scrolled -> e:',
			// e,
			'horizontal:',
			horizontalScrollValue,
			'thumbElementRef:',
			thumbElementRef,
			'thumbBoundingRect:',
			thumbBoundingRect,
			'scrollContainerEl:',
			scrollContainerEl,
			'scrollContainerEl.clientWidth:',
			scrollContainerEl.clientWidth
		);
	}

	// handle the pointermove event while over the timeline
	function handleTimelinePointerMove(e: MouseEvent) {
		// check first if we have even held down only the primary button
		if (!onlyPrimaryButtonClicked(e)) {
			return;
		}

		// if timeline thumb is already being dragged handle further timeline thumb dragging
		if ($isThumbBeingDragged) {
			moveTimelineThumb(e);
		}

		// if a timeline element is currently being resized further handle resizing
		if ($isTimelineElementBeingResized) {
			handleElementResizing(e);
		}
	}

	function handleMouseDown(e: MouseEvent) {
		// stop event from bubbling up
		e.stopPropagation();

		moveTimelineThumb(e);
	}
</script>

<div class="flex flex-col h-full timeline-container bg-background-highlight rounded-t-xl">
	<!-- Timeline Controls -->
	<TimelineControls></TimelineControls>

	<!-- Timeline Scroll Container -->
	<div
		class="flex flex-col w-full h-full gap-1 overflow-x-scroll overflow-y-scroll timeline-scroll-container"
		id="timeline-scroll-container"
		on:drop={onDropElement}
		on:dragleave={onDropElement}
		on:dragenter={onHoverElement}
		on:dragover={onHoverElement}
		on:pointermove={handleTimelinePointerMove}
		on:mousedown={handleMouseDown}
		on:scroll={onTimelineScroll}
		bind:this={scrollContainerEl}
	>
		{#if $timelineTracks.length === 0}
			<!-- show an empty state if nothing has been added to the timline -->
			<TimelineEmpty></TimelineEmpty>
		{:else}
			<!-- Timeline Content -->
			<!-- calculate width dynamically and fix width if element overflows -->
			<!-- if container doesn't overflow -> set width of element to be 100% in px -->
			<!-- and pass the calcualted width to the ruler to use it in there on the container element -->
			<div class="relative min-w-full w-max timeline-content">
				<!-- Timeline Ruler -->
				<TimelineRuler amountOfTicks={amountOfTicksRounded}></TimelineRuler>

				<!-- Timeline Thumb-->
				<TimelineThumb></TimelineThumb>

				<!-- Timeline Tracks -->
				<div class="relative flex flex-col pl-5 pb-6 timeline-tracks">
					{#each $timelineTracks as track, i (track.trackId)}
						<!-- the dropzone is highlighted automatically if something is hovered over it -->
						{#if i === 0}
							<TimelineRowDivider index={i}></TimelineRowDivider>
							<TimelineRow {track} index={i}></TimelineRow>
							<TimelineRowDivider index={i + 1}></TimelineRowDivider>
						{:else}
							<TimelineRow {track} index={i}></TimelineRow>
							<TimelineRowDivider index={i + 1}></TimelineRowDivider>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style lang="postcss">
	/* needs to have :global prefix because class gets added dynamically */
	/* TODO: if not needed anymore */
	:global(.drag-over) {
		background-color: red;
	}
</style>
