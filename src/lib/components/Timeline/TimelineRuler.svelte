<script lang="ts">
	import { convertPxToPlaybackScale } from '$lib/utils/utils';
	import {
		maxPlaybackTime,
		thumbOffset,
		currentThumbPosition,
		isThumbBeingDragged,
		currentTimelineScale,
		currentPlaybackTime
	} from '../../../stores/store';

	let maxPlaybackTimeVal = $maxPlaybackTime;

	// calculate number of seconds of max playback time
	let amountOfTicks = maxPlaybackTimeVal / 1000;
	// console.log('maxPlaybackTimeVal:', maxPlaybackTimeVal);

	// move thumb to current position if mouse is clicked over ruler
	function moveThumb(e: MouseEvent) {
		e.preventDefault();
		// only necessary for mouse move event to check if a mouse button is held down
		if (e.buttons === 1) {
			const newPos = e.clientX - $thumbOffset;
			$currentThumbPosition = newPos;

			// calculate playback time using the the new thumb position and write it into the store
			const playbackTime = convertPxToPlaybackScale(newPos, $currentTimelineScale);
			$currentPlaybackTime = playbackTime;

			console.log(
				'moveThumb -> e.clientX:',
				e.clientX,
				'thumbOffset:',
				$thumbOffset,
				'$currentThumbPosition,',
				$currentThumbPosition,
				'new playback time:',
				playbackTime
			);

			if (!$isThumbBeingDragged) {
				$isThumbBeingDragged = true;
				// console.log('isThumbBeingDragged?:', $isThumbBeingDragged);
			}
		}
	}
</script>

<div
	class="timeline-ruler sticky top-0 left-0 h-7 pl-5 bg-background-color border-ruler-color border-t-2 flex z-[1] cursor-grab select-none"
	on:mousedown={moveThumb}
	on:mousemove={moveThumb}
>
	{#each { length: $maxPlaybackTime / 1000 } as _, i}
		<div
			class="timeline-ruler-block flex flex-col items-start"
			style="width: {1 * $currentTimelineScale}px;"
		>
			<div class="timeline-ruler-tick w-px h-[5px] bg-ruler-color"></div>
			<div class="timeline-ruler-label text-ruler-color text-[11px] translate-x-[-50%]">
				{i}
			</div>
		</div>
	{/each}
</div>
