<script lang="ts">
	import type { IMedia } from '$lib/interfaces/Media';
	import { handleTimelineMediaDrop } from '$lib/utils/utils';
	import { timelineTracks } from '../../../stores/store';
	import TimelineRow from './TimelineRow.svelte';
	import TimelineRuler from './TimelineRuler.svelte';
	import TimelineThumb from './TimelineThumb.svelte';

	let hoverElement = false;

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
		// console.log('hover media:', e);

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
		<div class="flex-1 text-right">timeline controls</div>
	</div>

	<!-- Timeline Scroll Container -->
	<div
		class="timeline-scroll-container h-full flex flex-col gap-1 w-full overflow-x-scroll overflow-y-scroll"
		role="region"
		on:drop={onDropElement}
		on:dragleave={onDropElement}
		on:dragenter={onHoverElement}
		on:dragover={onHoverElement}
		style="background-color: {hoverElement ? '#2e2e35' : ''};"
	>
		<!-- Timeline Content -->
		<!-- calculate width dynamically and fix width if element overflows -->
		<!-- if container doesn't overflow -> set width of element to be 100% in px -->
		<!-- and pass the calcualted width to the ruler to use it in there on the container element -->
		<div class="timeline-content min-w-full h-auto relative">
			<!-- Timeline Ruler -->
			<TimelineRuler></TimelineRuler>

			<!-- Timeline Thumb-->
			<TimelineThumb></TimelineThumb>

			<!-- Timeline Tracks -->
			<div class="timeline-tracks flex flex-col gap-3 mb-3 pl-5">
				<!-- {#each $timelineTracks as track}
					<TimelineRow {track}></TimelineRow>
				{/each} -->

				<div class="bg-red-700 h-[50px] w-[2200px] mr-5"></div>
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
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
			</div>
		</div>
	</div>
</div>
