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
	import { convertPxToMs } from '$lib/utils/utils';

	const baseImgPath = 'src/lib/assets/';
	const imageUrls = [
		'header/close.png',
		'header/complete.png',
		'header/error.png',
		'preview/pause.png',
		'workbench/delete.png'
	];
	$: preloadImageUrls = imageUrls.map((url) => baseImgPath + url);

	// TODO: add onMount hook that resets the dragging store values on mouse up for the whole window
	onMount(async () => {
		// initialize all the ffmpeg stuff in the background
		// using async in this onMount is only fine if we don't
		// need to return a destroy function
		// see: https://stackoverflow.com/questions/62087073/svelte-3-async-onmount-or-a-valid-alternative#comment120532176_62118425
		await initializeFfmpeg();

		// get the initial window size
		onWindowResize(window.innerWidth);
	});

	//  listen to window changes and update the store variable on change
	function onWindowResize(width: number) {
		// subtract the offset from the window width
		const windowSizeMinusOffset = width - $thumbOffset;

		// convert the width into milliseconds to comapre it to the playbacktime that is also in milliseconds
		const widthInMs = convertPxToMs(windowSizeMinusOffset);

		// we only update the store variable if the window width is bigger than the most right end of any element (+ a smaller buffer)
		if (widthInMs <= $maxPlaybackTime + 1000) {
			return;
		}

		windowWidth.set(windowSizeMinusOffset);
	}
</script>

<main class="flex flex-col w-screen h-screen max-h-screen gap-1 overflow-hidden max-w-screen">
	<!-- TODO: check weird scrolling behavior-->
	<div class="flex-1 header">
		<Header></Header>
	</div>
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

<!-- preload images -->
<!-- TODO: check its possible to remove the warnings in the console caused by the preload -->
<svelte:head>
	{#each preloadImageUrls as image}
		<link rel="preload" as="image" href={image} />
	{/each}
</svelte:head>
