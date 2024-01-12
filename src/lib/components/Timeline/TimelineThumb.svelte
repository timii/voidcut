<script lang="ts">
	import { onMount } from 'svelte';

	let thumbPositionAfter = 0;
	let thumbOffsetLeft = 0;
	let thumbElementRef: HTMLElement;

	onMount(() => {
		// calculate left offset of thumb element
		thumbOffsetLeft = thumbElementRef.offsetLeft + Math.round(thumbElementRef.offsetWidth / 2);
	});

	// handle dragging thumb
	function dragElement(e: MouseEvent) {
		// console.log('e:', e);
		if (e.buttons === 1) {
			e.preventDefault();
			console.log(
				'dragElement start -> thumbPositionAfter:',
				thumbPositionAfter,
				'e.clientX:',
				e.clientX,
				'offsetLeft:',
				thumbElementRef.offsetLeft,
				'thumbOffsetLeft:',
				thumbOffsetLeft
			);

			// calculate new position using the current mouse position - the left offset of the thumb element
			thumbPositionAfter = e.clientX - thumbOffsetLeft;
		}
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="timeline-thumb w-[12px] h-[calc(100%+28px)] absolute ml-5 z-10 -left-[6px] -top-7 cursor-grab"
	bind:this={thumbElementRef}
	style="transform: translateX({thumbPositionAfter}px)"
	on:mousemove={dragElement}
>
	<div class="thumb-container w-full h-full flex flex-col items-center relative">
		<div
			class="thumb-header w-full h-[25px] bg-green-600 rounded-b-[50px] rounded-t-[20px] sticky top-0"
		></div>
		<div class="thumb-stick bg-blue-600 w-[2px] h-full"></div>
	</div>
</div>
