<script lang="ts">
	import { onMount } from 'svelte';
	import { currentThumbPosition, thumbOffset } from '../../../stores/store';

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

		// only drag element if mouse is held down
		if (e.buttons === 1) {
			e.preventDefault();
			// console.log(
			// 	'dragElement start -> thumbPositionAfter:',
			// 	thumbPosition,
			// 	'e.clientX:',
			// 	e.clientX,
			// 	'offsetLeft:',
			// 	thumbElementRef.offsetLeft,
			// 	'thumbOffsetLeft:',
			// 	thumbOffsetLeft
			// );

			// calculate new position using the current mouse position - the left offset of the thumb element
			const newPos = e.clientX - thumbOffsetLeft;

			// avoid the thumb to be moved further left than the tracks
			if (newPos >= 0) {
				thumbPosition = newPos;
				$currentThumbPosition = thumbPosition;
				console.log('currentThumbPosition:', $currentThumbPosition);
			}
		}
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
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
