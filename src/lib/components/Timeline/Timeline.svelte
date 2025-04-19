<script lang="ts">
	import type { IMedia } from '$lib/interfaces/Media';
	import {
		allBoundingRectValuesZero,
		convertMsToPx,
		hasHorizontalScrollbar,
		hasVerticalScrollbar,
		isDraggedElementAFile,
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
		draggedElementPosition,
		draggedOverFirstDivider,
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
		timelineTracks,
		verticalScroll
	} from '../../../stores/store';
	import { TimelineDropArea, type ITimelineTrack } from '$lib/interfaces/Timeline';
	import TimelineControls from './TimelineControls.svelte';
	import { CONSTS } from '$lib/utils/consts';
	import TimelineRowDivider from './TimelineRowDivider.svelte';
	import TimelineEmpty from './TimelineEmpty.svelte';
	import { dropTimelineElementHandler } from '$lib/utils/drop-timeline-element-handler.utils';
	import { hoverTimelineElementHandler } from '$lib/utils/hover-timeline-element-handler.utils';
	import {
		handleElementResizing,
		moveTimelineThumb,
		mediaDropOnTimeline
	} from '$lib/utils/timeline.utils';
	import { handleTimelineMediaDrop } from '$lib/utils/file.utils';

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

		isOverflowingY = hasVerticalScrollbar(scrollContainerEl);
		isOverflowingX = hasHorizontalScrollbar(scrollContainerEl);

		// get current width of timeline to calculate max playback time at the start
		amountOfTicks = scrollContainerEl.scrollWidth / $currentTimelineScale;
		amountOfTicksRounded = Math.ceil(amountOfTicks);

		// set amount of ticks at the start
		startAmountOfTicks.set(amountOfTicksRounded);

		// listen to event when a timeline element is dropped
		window.addEventListener(CONSTS.customEventNameDropTimelineElement, (e) =>
			dropTimelineElementHandler(e as CustomEvent)
		);
	});

	// handle where the dragged element is hovered over
	$: hoverTimelineElementHandler($draggedElementPosition, scrollContainerEl);

	// get the max playback time everytime the timelineTracks store changes
	$: getMaxPlaybackTime($timelineTracks);

	$: resetStoreValues($isTimelineElementBeingDragged);

	function getMaxPlaybackTime(tracks: ITimelineTrack[]) {
		// go through each row and element and check what the last playback time is
		if (tracks.length > 0) {
			let maxTime = 0;
			tracks.forEach((track) => {
				track.elements.forEach((element) => {
					// add element offset and duration to get the time the element ends
					const endTime = element.playbackStartTime + element.duration;
					if (endTime > maxTime) {
						maxTime = endTime;
					}
				});
			});
			maxPlaybackTime.set(maxTime);

			// update timeline ruler ticks amount to scale it with the increased timeline width
			// but only if the new amount of ticks is equal or more to the start amount
			const maxTimeAsTicks = Math.ceil(maxTime / CONSTS.secondsMultiplier);
			if (maxTimeAsTicks >= $startAmountOfTicks) {
				amountOfTicksRounded = maxTimeAsTicks;
			} else {
				// if the max time is smaller than the starting amount of ticks set it back to the starting value to avoid timeline ruler being short than screen
				amountOfTicksRounded = $startAmountOfTicks;
			}
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
		// reset all the variables used when checking if dragged element is over or under dividers
		resetOverUnderDividers();
		firstDivider = null;
		lastDivider = null;

		// check if the element was dropped over the first or under the last divider
		const rowIndex = $draggedOverFirstDivider ? 0 : $timelineTracks.length;

		mediaDropOnTimeline(e, TimelineDropArea.DIVIDER, rowIndex);
	}

	// update local variables if they're null
	function updateFirstAndLastDividerIfNull() {
		let dividers;

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
	}

	function onHoverElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();

		// don't highlight the timeline if an external file (that isn't added to media pool) is hovered over
		if (isDraggedElementAFile(e.dataTransfer?.items)) {
			return;
		}

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

		// subtract the horizontal scroll of current playback when scrolling to keep the thumb at the same time
		currentThumbPosition.set(convertMsToPx($currentPlaybackTime) - horizontalScrollValue);
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
		role="none"
	>
		{#if $timelineTracks.length === 0}
			<!-- show an empty state if nothing has been added to the timline -->
			<TimelineEmpty></TimelineEmpty>
		{:else}
			<!-- Timeline Content -->
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
	/* update scrollbar styling for timeline */
	::-webkit-scrollbar {
		width: 6px;
		height: 6px;
	}

	::-webkit-scrollbar-track {
		background: theme(colors.background-scrollbar-track);
	}

	::-webkit-scrollbar-thumb {
		background: theme(colors.background-scrollbar-thumb);
		border-radius: 10px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: theme(colors.background-scrollbar-thumb-hover);
	}

	::-webkit-scrollbar-corner {
		background: transparent;
	}
</style>
