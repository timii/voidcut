<script lang="ts">
	import type { IMedia } from '$lib/interfaces/Media';
	import {
		handleTimelineMediaDrop,
		hasHorizontalScrollbar,
		hasVerticalScrollbar,
		moveTimelineThumb,
		resetAllBeingDragged
	} from '$lib/utils/utils';
	import { onMount } from 'svelte';
	import TimelineRow from './TimelineRow.svelte';
	import TimelineRuler from './TimelineRuler.svelte';
	import TimelineThumb from './TimelineThumb.svelte';
	import {
		currentTimelineScale,
		horizontalScroll,
		maxPlaybackTime,
		startAmountOfTicks,
		thumbOffset,
		timelineTracks,
		verticalScroll
	} from '../../../stores/store';
	import type { ITimelineTrack } from '$lib/interfaces/Timeline';
	import TimelineControls from './TimelineControls.svelte';
	import { CONSTS } from '$lib/utils/consts';
	import TimelineRowDivider from './TimelineRowDivider.svelte';

	let hoverElement = false;
	let scrollContainerEl: HTMLDivElement;
	let isOverflowingX = false;
	let isOverflowingY = false;
	let amountOfTicks = 0;
	let amountOfTicksRounded = 0;

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
	});

	// get the max playback time everytime the timelineTracks store changes
	$: getMaxPlaybackTime($timelineTracks);
	// // call this function every time the timelineTracks store variable changes
	// $: $timelineTracks,
	// 	(() => {
	// 		console.log('Timeline -> timelineTracks changed:', $timelineTracks);
	// 	})();

	function getMaxPlaybackTime(tracks: ITimelineTrack[]) {
		console.log('Timeline -> timelineTracks changed:', $timelineTracks);
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

	function onDropElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverElement = false;

		handleAddElementToTimeline(e);
	}

	function onHoverElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverElement = true;

		// const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
		// const elemsBelow = document.elementsFromPoint(e.clientX, e.clientY);
		// console.log(
		// 	'onHoverElement -> e:',
		// 	e,
		// 	'e.clientX/e.clientY',
		// 	e.clientX,
		// 	'/',
		// 	e.clientY,
		// 	'elements:',
		// 	elemsBelow,
		// 	'elementFromPoint',
		// 	elemBelow,
		// 	'closest element:',
		// 	elemBelow?.closest('div')
		// );
	}

	function onHoverOverDivider(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		(e.target as HTMLDivElement).classList.add('drag-over');
	}

	function onDropOverDivider(e: DragEvent, index: number) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		(e.target as HTMLDivElement).classList.remove('drag-over');

		handleAddElementToTimeline(e, index);
	}

	//
	function handleAddElementToTimeline(e: DragEvent, index?: number) {
		// get data from dropped element
		let mediaDataString = e.dataTransfer?.getData(CONSTS.mediaPoolTransferKey);
		if (!mediaDataString) {
			return;
		}
		// parse it back to be a object again
		const mediaData: IMedia = JSON.parse(mediaDataString);

		// only handle files when actually dropped
		if (mediaData && e.type !== 'dragleave') {
			// console.log(
			// 	'element dropped in if:',
			// 	e,
			// 	'dataTransfer:',
			// 	e.dataTransfer,
			// 	'mediaData:',
			// 	mediaData
			// );
			handleTimelineMediaDrop(mediaData, index);
		}
	}

	// listen to scrolling in the timeline
	function onTimelineScroll(e: Event) {
		if (e.currentTarget) {
			const target = e.currentTarget as HTMLElement;
			const horizontalScrollValue = target.scrollLeft;
			const verticalScrollValue = target.scrollTop;
			$horizontalScroll = horizontalScrollValue;
			$verticalScroll = verticalScrollValue;
			// console.log(
			// 	'timeline scrolled -> e:',
			// 	e,
			// 	'horizontal:',
			// 	horizontalScrollValue,
			// 	'vertical:',
			// 	verticalScrollValue
			// );
		}
	}
</script>

<div class="timeline-container flex flex-col h-full gap-2">
	<!-- Timeline Controls -->
	<TimelineControls></TimelineControls>

	<!-- Timeline Scroll Container -->
	<div
		class="timeline-scroll-container h-full flex flex-col gap-1 w-full overflow-x-scroll overflow-y-scroll"
		on:drop={onDropElement}
		on:dragleave={onDropElement}
		on:dragenter={onHoverElement}
		on:dragover={onHoverElement}
		on:pointermove={moveTimelineThumb}
		on:mousedown={moveTimelineThumb}
		on:scroll={onTimelineScroll}
		style="background-color: {hoverElement && $timelineTracks.length === 0 ? '#2e2e35' : ''};"
		bind:this={scrollContainerEl}
	>
		<!-- Timeline Content -->
		<!-- calculate width dynamically and fix width if element overflows -->
		<!-- if container doesn't overflow -> set width of element to be 100% in px -->
		<!-- and pass the calcualted width to the ruler to use it in there on the container element -->
		<div
			class="timeline-content min-w-full h-auto relative"
			style="height: {isOverflowingY ? 'auto' : '100%'};"
		>
			<!-- Timeline Ruler -->
			<TimelineRuler amountOfTicks={amountOfTicksRounded}></TimelineRuler>

			<!-- Timeline Thumb-->
			<TimelineThumb></TimelineThumb>

			<!-- Timeline Tracks -->
			<div class="timeline-tracks flex flex-col mb-3 pl-5 relative">
				{#each $timelineTracks as track, i}
					<!-- TODO: add a dropzone between each track, before first and after last -->
					<!-- the dropzone is highlighted automatically if something is hovered over it -->
					{#if i === 0}
						<TimelineRowDivider></TimelineRowDivider>
						<!-- <div
							class="track-divider w-full bg-slate-500 h-[4px] mt-1 rounded-sm"
							on:drop={(e) => {
								onDropOverDivider(e, i);
							}}
							on:dragleave={(e) => {
								onDropOverDivider(e, i);
							}}
							on:dragenter={onHoverOverDivider}
							on:dragover={onHoverOverDivider}
							></div> -->
					{/if}
					<TimelineRow {track}></TimelineRow>
					<TimelineRowDivider></TimelineRowDivider>
					<!-- <div
						class="track-divider w-full bg-slate-500 h-[4px] rounded-sm"
						on:drop={(e) => {
							onDropOverDivider(e, i + 1);
						}}
						on:dragleave={(e) => {
							onDropOverDivider(e, i + 1);
						}}
						on:dragenter={onHoverOverDivider}
						on:dragover={onHoverOverDivider}
					></div> -->
				{/each}

				<!-- <div class="bg-red-700 h-[50px] w-[2200px] mr-5"></div>
				<div class="bg-red-700 h-[50px] w-[800px]"></div>
				<div class="bg-red-700 h-[50px] w-[600px] translate-x-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[200px] translate-x-[50px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div> -->
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	/* needs to have :global prefix because class gets added dynamically */
	:global(.drag-over) {
		background-color: red;
	}
</style>
