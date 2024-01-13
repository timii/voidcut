<script lang="ts">
	import { maxPlaybackTime, thumbOffset, currentThumbPosition } from '../../../stores/store';

	let maxPlaybackTimeVal = $maxPlaybackTime;

	// calculate number of seconds of max playback time
	let amountOfTicks = maxPlaybackTimeVal / 1000;
	console.log('maxPlaybackTimeVal:', maxPlaybackTimeVal);

	// move thumb to current position if mouse is clicked over ruler
	function moveThumb(e: MouseEvent) {
		// only necessary for mouse move event to check if a mouse button is held down
		if (e.buttons === 1) {
			$currentThumbPosition = e.clientX - $thumbOffset;
			console.log(
				'moveThumb:',
				$currentThumbPosition,
				'e.clientX:',
				e.clientX,
				'$thumbOffset:',
				$thumbOffset
			);
		}
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="timeline-ruler sticky top-0 left-0 h-7 pl-5 bg-background-color border-ruler-color border-t-2 flex z-[1] cursor-pointer"
	on:mousedown={moveThumb}
	on:mousemove={moveThumb}
>
	{#each { length: $maxPlaybackTime / 1000 } as _, i}
		<div class="timeline-ruler-block w-12 flex flex-col items-start">
			<div class="timeline-ruler-tick w-px h-[5px] bg-ruler-color"></div>
			<div class="timeline-ruler-label text-ruler-color text-[11px] translate-x-[-50%]">
				{i}
			</div>
		</div>
	{/each}
</div>
