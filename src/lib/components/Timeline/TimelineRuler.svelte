<script lang="ts">
	import { CONSTS } from '$lib/utils/consts';
	import { formatTime, moveTimelineThumb } from '$lib/utils/utils';
	import { currentTimelineScale, windowWidth } from '../../../stores/store';

	export let amountOfTicks = 30;

	// update the amount of ticks everytime the window width or timeline scale is updated
	$: updateAmountOfTicks($windowWidth, $currentTimelineScale);

	function updateAmountOfTicks(widthInPx: number, scale: number) {
		// calculate how many ticks can fit into the current width using the scale as the width of each tick
		amountOfTicks = Math.ceil(widthInPx / scale);
	}

	// ignore the hovered element
	function onHoverElement(e: DragEvent) {
		e.stopPropagation();
	}
</script>

<div
	class="timeline-ruler sticky top-0 left-0 h-7 pl-5 bg-background-color border-ruler-color border-t-2 flex z-[1] cursor-grab select-none w-fit min-w-full"
	on:mousedown={moveTimelineThumb}
	on:mousemove={moveTimelineThumb}
	on:dragenter={onHoverElement}
	on:dragover={onHoverElement}
>
	{#each { length: amountOfTicks } as _, i}
		<div
			class="flex flex-col items-start timeline-ruler-block"
			style="min-width: {$currentTimelineScale}px;"
		>
			<div class="timeline-ruler-tick w-px h-[5px] bg-ruler-color"></div>
			<div class="timeline-ruler-label text-ruler-color text-xxxs translate-x-[-50%]">
				{formatTime(i * CONSTS.secondsMultiplier, false)}
			</div>
		</div>
	{/each}
</div>
