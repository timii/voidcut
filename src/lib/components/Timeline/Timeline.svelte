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
	import { currentTimelineScale, timelineTracks } from '../../../stores/store';

	let hoverElement = false;
	let scrollContainerEl: HTMLDivElement;
	let isOverflowingX = false;
	let isOverflowingY = false;

	onMount(() => {
		// listen to mouseup events of the window
		window.addEventListener('mouseup', (e: MouseEvent) => {
			resetAllBeingDragged();
			console.log('window mouseup');
		});

		isOverflowingY = hasVerticalScrollbar(scrollContainerEl);
		isOverflowingX = hasHorizontalScrollbar(scrollContainerEl);

		console.log(
			'onMount -> scrollContainerEl:',
			scrollContainerEl,
			'overflowY?:',
			isOverflowingY,
			'overflowX?:',
			isOverflowingX
		);
	});

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
			console.log(
				'element dropped in if:',
				e,
				'dataTransfer:',
				e.dataTransfer,
				'mediaData:',
				mediaData
			);
			handleTimelineMediaDrop(mediaData);
		}
	}

	function onHoverElement(e: DragEvent) {
		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverElement = true;
	}
</script>

<div class="timeline-container flex flex-col h-full gap-2">
	<!-- Timeline Controls -->
	<div class="timeline-controls flex flex-row p-1 border">
		<div class="flex-1">element controls</div>
		<div class="flex-1 text-center">time</div>
		<div class="flex-1 text-right">
			<div class="flex gap-3 justify-end mr-12 text-lg">
				<div class="increase-scale cursor-pointer" on:click={increaseTimelineScale}>+</div>
				<div class="decrease-scale cursor-pointer" on:click={decreaseTimelineScale}>-</div>
			</div>
		</div>
	</div>

	<!-- Timeline Scroll Container -->
	<div
		class="timeline-scroll-container h-full flex flex-col gap-1 w-full overflow-x-scroll overflow-y-scroll"
		on:drop={onDropElement}
		on:dragleave={onDropElement}
		on:dragenter={onHoverElement}
		on:dragover={onHoverElement}
		on:mousemove={moveTimelineThumb}
		on:mousedown={moveTimelineThumb}
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
			<TimelineRuler></TimelineRuler>

			<!-- Timeline Thumb-->
			<TimelineThumb></TimelineThumb>

			<!-- Timeline Tracks -->
			<div class="timeline-tracks flex flex-col gap-3 mb-3 pl-5">
				<!-- {#each $timelineTracks as track}
					<TimelineRow {track}></TimelineRow>
				{/each} -->

				<div class="bg-red-700 h-[50px] w-[20px] mr-5"></div>
				<div class="bg-red-700 h-[50px] w-[80px]"></div>
				<div class="bg-red-700 h-[50px] w-[80px]"></div>
				<div class="bg-red-700 h-[50px] w-[80px]"></div>
				<div class="bg-red-700 h-[50px] w-[80px]"></div>
				<div class="bg-red-700 h-[50px] w-[80px]"></div>
				<div class="bg-red-700 h-[50px] w-[80px]"></div>
				<div class="bg-red-700 h-[50px] w-[80px]"></div>
				<div class="bg-red-700 h-[50px] w-[80px]"></div>
				<div class="bg-red-700 h-[50px] w-[80px]"></div>
				<!-- <div class="bg-red-700 h-[50px] w-[600px] translate-x-[300px]"></div>
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
