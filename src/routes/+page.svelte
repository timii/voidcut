<script lang="ts">
	import Timeline from '$lib/components/timeline/Timeline.svelte';
	import MediaPool from '$lib/components/workbench/MediaPool.svelte';
	import Preview from '$lib/components/preview/Preview.svelte';
	import {
		currentTimelineScale,
		exportOverlayOpen,
		maxPlaybackTime,
		thumbOffset,
		windowWidth
	} from '../stores/store';
	import { CONSTS } from '$lib/utils/consts';
	import Header from '$lib/components/header/Header.svelte';
	import { onMount } from 'svelte';
	import { initializeFfmpeg } from '$lib/utils/ffmpeg.utils';
	import Overlay from '$lib/components/shared/Overlay.svelte';
	import ExportDialog from '$lib/components/header/ExportDialog.svelte';

	// TODO: add onMount hook that resets the Dragging storte values on mouse up for the whole window
	onMount(async () => {
		// initialize all the ffmpeg stuff in the background
		// using async in this onMount is only fine if we don't
		// need to return a destroy function
		// see: https://stackoverflow.com/questions/62087073/svelte-3-async-onmount-or-a-valid-alternative#comment120532176_62118425
		await initializeFfmpeg();
	});

	//  listen to window changes and update the store variable on change
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
	<Header></Header>
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

<Overlay>
	<ExportDialog open={$exportOverlayOpen} />
</Overlay>

<svelte:window on:resize={() => onWindowResize(innerWidth)} />
