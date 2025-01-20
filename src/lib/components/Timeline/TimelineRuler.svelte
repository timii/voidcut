<script lang="ts">
	import { CONSTS } from '$lib/utils/consts';
	import {
		convertMsToPx,
		formatTime,
		getTailwindVariables,
		moveTimelineThumb
	} from '$lib/utils/utils';
	import { currentTimelineScale, maxPlaybackTime, windowWidth } from '../../../stores/store';

	export let amountOfTicks = 30;

	// update the amount of ticks everytime the window width, timeline scale or max playback time is changed
	$: updateAmountOfTicks($windowWidth, $currentTimelineScale);
	$: $maxPlaybackTime, updateAmountOfTicks($windowWidth, $currentTimelineScale);

	const tailwindVariables = getTailwindVariables();
	const tailwindColors = tailwindVariables.theme.colors;

	function updateAmountOfTicks(widthInPx: number, scale: number) {
		// get the max playback time and convert it ms
		const maxPlayback = $maxPlaybackTime;
		const maxPlaybackInPx = convertMsToPx(maxPlayback);

		// check what value is bigger between the window size and the max playback (+ a small buffer)
		const biggerValue = Math.max(widthInPx + 80, maxPlaybackInPx + 80);

		// calculate how many ticks can fit into the current max width using the scale as the width of each tick
		amountOfTicks = Math.ceil(biggerValue / scale);

	}

	// ignore the hovered element
	function onHoverElement(e: DragEvent) {
		e.stopPropagation();
	}

	// handle when to show a tickby returning either the normal color or the background color to "hide" it
	function handleTickShow(index: number): string {
		const customColors = tailwindColors as any;
		// normale tick color to show a tick
		const rulerColor = customColors['ruler-color'];
		// background color to hide a tick
		const backgroundColor = customColors['background-color'];
		const currentScale = $currentTimelineScale;

		if (currentScale >= 20) {
			// show a tick every second
			return rulerColor;
		} else {
			// show a tick for every label and between every label
			const n = CONSTS.timelineStartingScale / currentScale / 2;
			return (index % n) / 2 === 0 ? rulerColor : backgroundColor;
		}
	}

	// handle when to show tick labels
	function handleTickLabel(index: number): string {
		const currentScale = $currentTimelineScale;

		if (currentScale >= CONSTS.timelineStartingScale) {
			// show a number every tick
			return formatTime(index * CONSTS.secondsMultiplier, false);
		} else {
			// show a number every nth tick where every time the scale halfs we double n
			const n = CONSTS.timelineStartingScale / currentScale;
			return index % n === 0 ? formatTime(index * CONSTS.secondsMultiplier, false) : '';
		}
	}
</script>

<div
	class="timeline-ruler sticky top-0 left-0 h-7 pl-5 bg-background-color border-ruler-color border-t-2 flex z-[1] cursor-grab select-none w-fit min-w-full"
	on:mousedown={moveTimelineThumb}
	on:mousemove={moveTimelineThumb}
	on:dragenter={onHoverElement}
	on:dragover={onHoverElement}
>
	{#each { length: amountOfTicks } as _, i (i)}
		<div
			class="flex flex-col items-start timeline-ruler-block"
			style="width: {$currentTimelineScale}px;"
		>
			<div
				class="timeline-ruler-tick w-px h-[5px] bg-ruler-color"
				style="background-color: {handleTickShow(i)};"
			></div>
			<div class="timeline-ruler-label text-ruler-color text-xxxs translate-x-[-50%]">
				{handleTickLabel(i)}
			</div>
		</div>
	{/each}
</div>
