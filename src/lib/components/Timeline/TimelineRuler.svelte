<script lang="ts">
	import { CONSTS } from '$lib/utils/consts';
	import { moveTimelineThumb } from '$lib/utils/utils';
	import { currentTimelineScale, windowWidth } from '../../../stores/store';

	export let amountOfTicks = 30;

	// update the amount of ticks everytime the window width store value is updated
	$: updateAmountOfTicks($windowWidth);

	function updateAmountOfTicks(widthInMs: number) {
		console.log('updateAmountOfTicks -> width:', widthInMs);

		amountOfTicks = Math.ceil(widthInMs / CONSTS.secondsMultiplier);
	}

	// calculate number of seconds of max playback time
	// let amountOfTicks = $maxPlaybackTime / 1000;
	// console.log('maxPlaybackTimeVal:', maxPlaybackTimeVal);
</script>

<div
	class="timeline-ruler sticky top-0 left-0 h-7 pl-5 bg-background-color border-ruler-color border-t-2 flex z-[1] cursor-grab select-none w-fit min-w-full"
	on:mousedown={moveTimelineThumb}
	on:mousemove={moveTimelineThumb}
>
	<!-- {#each { length: amountOfTicks / 1000 } as _, i} -->
	{#each { length: amountOfTicks } as _, i}
		<div
			class="flex flex-col items-start timeline-ruler-block"
			style="min-width: {$currentTimelineScale}px;"
		>
			<div class="timeline-ruler-tick w-px h-[5px] bg-ruler-color"></div>
			<div class="timeline-ruler-label text-ruler-color text-[11px] translate-x-[-50%]">
				{i}
			</div>
		</div>
	{/each}
</div>
