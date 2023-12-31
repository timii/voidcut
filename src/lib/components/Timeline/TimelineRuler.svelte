<script lang="ts">
	import { maxPlaybackTime } from '../../../stores/store';

	let maxPlaybackTimeVal = $maxPlaybackTime;

	// calculate number of seconds of max playback time
	let amountOfTicks = maxPlaybackTimeVal / 1000;
	console.log('maxPlaybackTimeVal:', maxPlaybackTimeVal);
</script>

<div
	class="timeline-ruler sticky top-0 left-0 h-7 pl-5 bg-background-color border-ruler-color border-t-2 flex z-[1]"
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
