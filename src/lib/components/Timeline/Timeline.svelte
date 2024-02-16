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

	let hoverElement = false;
	let scrollContainerEl: HTMLDivElement;
	let isOverflowingX = false;
	let isOverflowingY = false;
	let amountOfTicks = 0;
	let amountOfTicksRounded = 0;

	onMount(() => {
		// listen to mouseup events of the window
		window.addEventListener('mouseup', (e: MouseEvent) => {
			resetAllBeingDragged();
			console.log('window mouseup');
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
			const maxTimeAsTicks = Math.ceil(maxTime / 1000);
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
		// console.log('element dropped:', e, 'dataTransfer:', e.dataTransfer);

		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();

		hoverElement = false;

		// get data from dropped element
		let mediaDataString = e.dataTransfer?.getData('media-data');
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
			handleTimelineMediaDrop(mediaData);
		}
	}

	function onHoverElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverElement = true;
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
		on:mousemove={moveTimelineThumb}
		on:mousedown={moveTimelineThumb}
		on:scroll={onTimelineScroll}
		style="background-color: {hoverElement ? '#2e2e35' : ''};"
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
			<div class="timeline-tracks flex flex-col gap-3 mb-3 pl-5">
				{#each $timelineTracks as track}
					<TimelineRow {track}></TimelineRow>
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
