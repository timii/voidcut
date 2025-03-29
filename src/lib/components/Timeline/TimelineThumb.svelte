<script lang="ts">
	import { onMount } from 'svelte';
	import {
		currentThumbPosition,
		thumbOffset,
		currentPlaybackTime,
		previewPlaying,
		isThumbBeingDragged,
		currentTimelineScale,
		horizontalScroll
	} from '../../../stores/store';
	import {
		convertMsToPx,
		isElementFullyScrolled,
		moveTimelineThumb,
		pausePlayback
	} from '$lib/utils/utils';
	import { CONSTS } from '$lib/utils/consts';

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

	// update thumb position when timeline scale changes
	$: onScaleChange($currentTimelineScale);

	// dynamically calculate thumb position when playback time in store updates
	$: onPlaybackTimeChange($currentPlaybackTime);

	function onScaleChange(scale: number) {
		const playbackInS = $currentPlaybackTime / CONSTS.secondsMultiplier;

		// calculate new thumb position using the updated scale
		const newPosition = playbackInS * scale;
		currentThumbPosition.set(newPosition);
	}

	function onPlaybackTimeChange(_: number) {
		console.log('onPlaybackTimeChange');

		if ($isThumbBeingDragged) {
			return;
		}

		// consider horizontal scroll for new thumb position
		$currentThumbPosition = convertMsToPx($currentPlaybackTime) - $horizontalScroll;

		const thumbBoundingRect = thumbElementRef?.getBoundingClientRect();
		const scrollContainerBoundingRect = timelineScrollContainer?.getBoundingClientRect();

		if (!thumbBoundingRect) {
			return;
		}

		if (!scrollContainerBoundingRect || !timelineScrollContainer) {
			return;
		}

		const timelineFullyScrolled = isElementFullyScrolled(timelineScrollContainer);

		// check if thumb is on the right edge
		if (
			scrollContainerBoundingRect.width - thumbBoundingRect.x < 42 &&
			scrollContainerBoundingRect.width - thumbBoundingRect.x >= 0 &&
			!timelineFullyScrolled
		) {
			timelineScrollContainer.scrollBy({ left: 7, behavior: 'smooth' });
		}

		// check if thumb is on the left edge
		if (thumbBoundingRect.x < 42 && thumbBoundingRect.x >= 0) {
			timelineScrollContainer.scrollBy({ left: -6, behavior: 'smooth' });
		}

		// if the thumb goes further right than the timeline width stop the playback
		if (
			timelineFullyScrolled &&
			scrollContainerBoundingRect.width - thumbBoundingRect.x < 0 &&
			$previewPlaying === true
		) {
			console.warn(
				'in if -> timelineFullyScrolled:',
				timelineFullyScrolled,
				'scrollContainerBoundingRect.width - thumbBoundingRect.x < 0:',
				scrollContainerBoundingRect.width - thumbBoundingRect.x < 0,
				'$previewPlaying:',
				$previewPlaying
			);
			pausePlayback();
		}
	}

	function onThumbMove(e: MouseEvent) {
		// stop event from bubbling up to timeline
		e.stopPropagation();

		moveTimelineThumb(e, true);
	}
</script>

<div
	class="timeline-thumb w-[12px] h-[calc(100%+28px)] fixed ml-5 z-10 cursor-grab duration-0"
	id="timeline-thumb"
	bind:this={thumbElementRef}
	style="transform: translate({-6 + $currentThumbPosition}px, -28px)"
	on:mousemove={onThumbMove}
	on:mousedown={onThumbMove}
	on:pointermove={onThumbMove}
	role="none"
>
	<!-- on:mousedown={scrollTimeline} -->
	<!-- on:mouseup={stopScrolling} -->
	<div class="relative flex flex-col items-center w-full h-full thumb-container">
		<div
			class="thumb-header w-full h-[25px] bg-background-ruler rounded-b-[50px] rounded-t-[20px] sticky top-0"
		></div>
		<div class="thumb-stick bg-background-ruler w-[2px] h-full"></div>
	</div>
</div>
