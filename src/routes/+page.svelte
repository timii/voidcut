<script lang="ts">
	import Timeline from '$lib/components/timeline/Timeline.svelte';
	import MediaPool from '$lib/components/workbench/MediaPool.svelte';
	import Preview from '$lib/components/preview/Preview.svelte';
	import { currentTimelineScale, maxPlaybackTime, thumbOffset, windowWidth } from '../stores/store';
	import { CONSTS } from '$lib/utils/consts';

	function onWindowResize(width: number) {
		const widthInMs = Math.round(
			((width - $thumbOffset) / $currentTimelineScale) * CONSTS.secondsMultiplier
		);

		// we only update the store variable if the window width is bigger than the most right end of any element (+ a smaller buffer)
		if (widthInMs <= $maxPlaybackTime + 1000) {
			return;
		}

		windowWidth.set(widthInMs);
	}
</script>

<main class="flex flex-col w-screen h-screen max-h-screen gap-1 max-w-screen">
	<div class="flex flex-1 basis-2/3 shrink-0">
		<div class="flex-1 p-4 border-2 workbench basis-1/3">
			<MediaPool></MediaPool>
		</div>
		<div class="flex-1 p-4 border-2 preview basis-2/3">
			<Preview></Preview>
		</div>
	</div>
	<div class="timeline border-2 pt-4 flex-1 basis-1/3 h-[33%]">
		<Timeline></Timeline>
	</div>
</main>

<!-- listen to window changes and update the store variable on change -->
<svelte:window on:resize={() => onWindowResize(innerWidth)} />
