<script lang="ts">
	import { onMount } from 'svelte';
	import { currentThumbPosition, thumbOffset, currentPlaybackTime } from '../../../stores/store';
	import { convertPlaybackToPxScale, moveTimelineThumb } from '$lib/utils/utils';
	import { CONSTS } from '$lib/utils/consts';

	let thumbPosition = $currentThumbPosition;
	let thumbOffsetLeft = 0;
	let thumbElementRef: HTMLElement;
	let scrollInterval: number | undefined;
	let timelineScrollContainer: HTMLElement | null;

	onMount(() => {
		// calculate left offset of thumb element
		thumbOffsetLeft = thumbElementRef.offsetLeft + Math.round(thumbElementRef.offsetWidth / 2);
		$thumbOffset = thumbOffsetLeft;

		if (!timelineScrollContainer) {
			timelineScrollContainer = document.getElementById('timeline-scroll-container');
		}
	});

	// dynamically calculate thumb position when playback time in store updates
	$: $currentPlaybackTime,
		(() => {
			// console.log('in timelineThumb before -> $currentThumbPosition,', $currentThumbPosition);
			$currentThumbPosition = convertPlaybackToPxScale();
			// console.log('in timelineThumb after -> $currentThumbPosition,', $currentThumbPosition);

			// TODO: scroll timeline if thumb is outside of view

			const thumbBoundingRect = thumbElementRef?.getBoundingClientRect();
			const scrollContainerBoundingRect = timelineScrollContainer?.getBoundingClientRect();

			if (!thumbBoundingRect) {
				return;
			}

			if (!scrollContainerBoundingRect || !timelineScrollContainer) {
				return;
			}

			const timelineFullyScrolled =
				timelineScrollContainer.scrollWidth - timelineScrollContainer.scrollLeft ===
				timelineScrollContainer.clientWidth;

			// check if thumb is on the right edge
			if (
				scrollContainerBoundingRect.width - thumbBoundingRect.x < 42 &&
				scrollContainerBoundingRect.width - thumbBoundingRect.x >= 0 &&
				!timelineFullyScrolled
			) {
				timelineScrollContainer.scrollBy(2, 0);
			}
		})();

	function scrollTimeline(e: MouseEvent) {
		e.preventDefault();

		// const thumbBoundingRect = document.getElementById('timeline-thumb')?.getBoundingClientRect();
		// if (!thumbBoundingRect) {
		// return;
		// }

		if (!timelineScrollContainer) {
			timelineScrollContainer = document.getElementById('timeline-scroll-container');
		}
		const scrollContainerBoundingRect = timelineScrollContainer?.getBoundingClientRect();
		const startScrollWidth = timelineScrollContainer?.scrollWidth;

		// }
		// if the thumb is at the left or right edge of the screen (with some buffers) scroll the timeline horizontally
		// left edge
		scrollInterval = setInterval(() => {
			const thumbElement = document.getElementById('timeline-thumb');
			const thumbBoundingRect = thumbElement?.getBoundingClientRect();

			if (!thumbBoundingRect) {
				return;
			}

			if (!scrollContainerBoundingRect || !timelineScrollContainer) {
				return;
			}

			// avoid the timeline container to keep on expanding if the thumb is dragged to the right edge
			if (
				startScrollWidth === undefined ||
				timelineScrollContainer?.scrollWidth > startScrollWidth
			) {
				return;
			}

			// if the thumb is dragged to the left edge of the timeline scroll to the left
			if (thumbBoundingRect.x < 16 && thumbBoundingRect.x >= 0) {
				// console.log(
				// 	'thumb in if',
				// 	thumbBoundingRect,
				// 	'timelineScrollContainer:',
				// 	timelineScrollContainer,
				// 	'scrollContainerBoundingRect:',
				// 	scrollContainerBoundingRect,
				// 	'scrollLeft:',
				// 	timelineScrollContainer?.scrollLeft
				// );
				requestAnimationFrame(() => {
					const scrollValue = -10;
					timelineScrollContainer?.scrollBy(scrollValue, 0);
					// avoid the thumb going too far to the left
					currentThumbPosition.update((value) => Math.max(0, value + scrollValue));
				});
			}

			const timelineFullyScrolled =
				timelineScrollContainer.scrollWidth - timelineScrollContainer.scrollLeft ===
				timelineScrollContainer.clientWidth;

			// if the thumb is dragged to the right edge of the timeline scroll to the right
			if (scrollContainerBoundingRect.width - thumbBoundingRect.x < 16 && !timelineFullyScrolled) {
				// console.log(
				// 	'thumb in if',
				// 	thumbBoundingRect,
				// 	'thumbElement:',
				// 	thumbElement,
				// 	'timelineScrollContainer:',
				// 	timelineScrollContainer,
				// 	'scrollContainerBoundingRect:',
				// 	scrollContainerBoundingRect,
				// 	'scrollLeft:',
				// 	timelineScrollContainer.scrollLeft,
				// 	'scrollWidth:',
				// 	timelineScrollContainer.scrollWidth,
				// 	'clientWidth:',
				// 	timelineScrollContainer.clientWidth,
				// 	'scrollWidth - scrollLeft:',
				// 	timelineScrollContainer.scrollWidth - timelineScrollContainer.scrollLeft,
				// 	'timelineFullyScrolled:',
				// 	timelineFullyScrolled,
				// 	'scrollContainerBoundingRect.width:',
				// 	scrollContainerBoundingRect.width,
				// 	'thumbBoundingRect.x:',
				// 	thumbBoundingRect.x,
				// 	'scrollContainerBoundingRect.width - thumbBoundingRect.x:',
				// 	scrollContainerBoundingRect.width - thumbBoundingRect.x
				// );
				// TODO: implement right side scrolling
				requestAnimationFrame(() => {
					const scrollValue = 10;
					timelineScrollContainer?.scrollBy(scrollValue, 0);
					// avoid the thumb going too far to the right (maximum end of most right element)
					currentThumbPosition.update((value) => Math.max(0, value + scrollValue));
				});
			}
		}, CONSTS.timelineScrollIntervalTimer);
		// }
	}

	function stopScrolling(e: MouseEvent) {
		if (scrollInterval !== undefined) {
			clearInterval(scrollInterval);
		}
	}
</script>

<div
	class="timeline-thumb w-[12px] h-[calc(100%+28px)] absolute ml-5 z-10 -left-[6px] -top-7 cursor-grab duration-0"
	id="timeline-thumb"
	bind:this={thumbElementRef}
	style="transform: translateX({$currentThumbPosition}px)"
	on:mousemove={moveTimelineThumb}
	on:mousedown={scrollTimeline}
	on:mouseup={stopScrolling}
>
	<div class="relative flex flex-col items-center w-full h-full thumb-container">
		<div
			class="thumb-header w-full h-[25px] bg-green-600 rounded-b-[50px] rounded-t-[20px] sticky top-0"
		></div>
		<div class="thumb-stick bg-blue-600 w-[2px] h-full"></div>
	</div>
</div>
