<script lang="ts">
	import { convertPxToPlaybackScale, moveTimelineThumb } from '$lib/utils/utils';
	import {
		maxPlaybackTime,
		thumbOffset,
		currentThumbPosition,
		isThumbBeingDragged,
		currentTimelineScale,
		currentPlaybackTime
	} from '../../../stores/store';

	export let amountOfTicks = 30;

	// calculate number of seconds of max playback time
	// let amountOfTicks = $maxPlaybackTime / 1000;
	// console.log('maxPlaybackTimeVal:', maxPlaybackTimeVal);
</script>

<div
	class="timeline-ruler sticky top-0 left-0 h-7 pl-5 bg-background-color border-ruler-color border-t-2 flex z-[1] cursor-grab select-none"
	on:mousedown={moveTimelineThumb}
	on:mousemove={moveTimelineThumb}
>
	<!-- {#each { length: amountOfTicks / 1000 } as _, i} -->
	{#each { length: amountOfTicks } as _, i}
		<div
			class="timeline-ruler-block flex flex-col items-start"
			style="min-width: {$currentTimelineScale}px;"
		>
			<div class="timeline-ruler-tick w-px h-[5px] bg-ruler-color"></div>
			<div class="timeline-ruler-label text-ruler-color text-[11px] translate-x-[-50%]">
				{i}
			</div>
		</div>
	{/each}
</div>
