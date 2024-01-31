<script lang="ts">
	import { onMount } from 'svelte';
	import {
		currentThumbPosition,
		isThumbBeingDragged,
		thumbOffset,
		currentPlaybackTime,
		currentTimelineScale
	} from '../../../stores/store';
	import { convertPxToPlaybackScale } from '$lib/utils/utils';

	let thumbPosition = $currentThumbPosition;
	let thumbOffsetLeft = 0;
	let thumbElementRef: HTMLElement;

	onMount(() => {
		// calculate left offset of thumb element
		thumbOffsetLeft = thumbElementRef.offsetLeft + Math.round(thumbElementRef.offsetWidth / 2);
		$thumbOffset = thumbOffsetLeft;
	});

	// handle dragging thumb
	function dragElement(e: MouseEvent) {
		// console.log('e:', e);
		e.preventDefault();

		// only drag element if mouse is held down
		if (e.buttons === 1) {
			// calculate new position using the current mouse position - the left offset of the thumb element
			const newPos = e.clientX - thumbOffsetLeft;

			// avoid the thumb to be moved further left than the tracks
			if (newPos >= 0) {
				$currentThumbPosition = newPos;

				// calculate playback time using the the new thumb position and write it into the store
				const playbackTime = convertPxToPlaybackScale(newPos, $currentTimelineScale);
				$currentPlaybackTime = playbackTime;

				console.log('currentThumbPosition:', $currentThumbPosition, 'playbackTime:', playbackTime);

				if (!$isThumbBeingDragged) {
					$isThumbBeingDragged = true;
					console.log('isThumbBeingDragged?:', $isThumbBeingDragged);
				}
			}
		}
	}

	// dynamically calculate thumb position using the current playback time from the store
	$: $currentPlaybackTime,
		(() => {
			// console.log('in timelineThumb before -> $currentThumbPosition,', $currentThumbPosition);
			$currentThumbPosition = ($currentPlaybackTime / 1000) * $currentTimelineScale;
			// console.log('in timelineThumb after -> $currentThumbPosition,', $currentThumbPosition);
		})();
	// ($currentPlaybackTime / 1000) * $currentTimelineScale;
</script>

<div
	class="timeline-thumb w-[12px] h-[calc(100%+28px)] absolute ml-5 z-10 -left-[6px] -top-7 cursor-grab"
	bind:this={thumbElementRef}
	style="transform: translateX({$currentThumbPosition}px)"
	on:mousemove={dragElement}
>
	<div class="thumb-container w-full h-full flex flex-col items-center relative">
		<div
			class="thumb-header w-full h-[25px] bg-green-600 rounded-b-[50px] rounded-t-[20px] sticky top-0"
		></div>
		<div class="thumb-stick bg-blue-600 w-[2px] h-full"></div>
	</div>
</div>
