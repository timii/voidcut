<script lang="ts">
	import { onMount } from 'svelte';
	import {
		currentThumbPosition,
		isThumbBeingDragged,
		thumbOffset,
		currentPlaybackTime,
		currentTimelineScale
	} from '../../../stores/store';
	import {
		convertPlaybackToPxScale,
		convertPxToPlaybackScale,
		moveTimelineThumb
	} from '$lib/utils/utils';

	let thumbPosition = $currentThumbPosition;
	let thumbOffsetLeft = 0;
	let thumbElementRef: HTMLElement;

	onMount(() => {
		// calculate left offset of thumb element
		thumbOffsetLeft = thumbElementRef.offsetLeft + Math.round(thumbElementRef.offsetWidth / 2);
		$thumbOffset = thumbOffsetLeft;
	});

	// dynamically calculate thumb position when playback time in store updates
	$: $currentPlaybackTime,
		(() => {
			// console.log('in timelineThumb before -> $currentThumbPosition,', $currentThumbPosition);
			$currentThumbPosition = convertPlaybackToPxScale();
			// console.log('in timelineThumb after -> $currentThumbPosition,', $currentThumbPosition);
		})();
</script>

<div
	class="timeline-thumb w-[12px] h-[calc(100%+28px)] absolute ml-5 z-10 -left-[6px] -top-7 cursor-grab duration-0"
	bind:this={thumbElementRef}
	style="transform: translateX({$currentThumbPosition}px)"
	on:mousemove={moveTimelineThumb}
>
	<div class="thumb-container w-full h-full flex flex-col items-center relative">
		<div
			class="thumb-header w-full h-[25px] bg-green-600 rounded-b-[50px] rounded-t-[20px] sticky top-0"
		></div>
		<div class="thumb-stick bg-blue-600 w-[2px] h-full"></div>
	</div>
</div>
