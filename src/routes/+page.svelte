<script lang="ts">
	import Timeline from '$lib/components/timeline/Timeline.svelte';
	import MediaPool from '$lib/components/workbench/MediaPool.svelte';
	import Preview from '$lib/components/preview/Preview.svelte';
	import {
		aboutOverlayOpen,
		exportOverlayOpen,
		restoreStateOverlayOpen,
		thumbOffset,
		windowHeight,
		windowWidth
	} from '../stores/store';
	import Header from '$lib/components/header/Header.svelte';
	import { onMount } from 'svelte';
	import { initializeFfmpeg } from '$lib/utils/ffmpeg.utils';
	import Overlay from '$lib/components/shared/Overlay.svelte';
	import ExportDialog from '$lib/components/header/ExportDialog.svelte';
	import AboutDialog from '$lib/components/header/AboutDialog.svelte';
	import { lastStateAvailable, restoreLastState } from '$lib/utils/persistence.utils';
	import RestoreStateDialog from '$lib/components/persistence/RestoreStateDialog.svelte';

	// list of images that are being preloaded
	const baseImgPath = 'src/lib/assets/';
	const imageUrls = [
		'header/close.png',
		'header/complete.png',
		'header/error.png',
		'header/export.png',
		'header/download.png',
		'header/cancel.png',
		'header/github.png',
		'preview/pause.png',
		'workbench/delete.png',
		'workbench/upload.png'
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
		onWindowResize(window.innerWidth, window.innerHeight);

		// block dropping files other than the media pool so the local file isn't opened in the tab
		const eventsToBlock = ['drop', 'dragover'];
		eventsToBlock.forEach((event) => {
			document.addEventListener(
				event,
				(e) => {
					e.preventDefault();
				},
				false
			);
		});

		// setup and start the interval for locally backing up the state
		// setupBackupInterval();

		// if there is a saved state in local storage, restore it
		if (lastStateAvailable()) {
			// show dialog while last state is being restored
			restoreStateOverlayOpen.set(true);
			restoreLastState();
		}
	});

	//  listen to window changes and update the store variable on change
	function onWindowResize(width: number, height: number) {
		// subtract the offset from the window width
		const windowSizeMinusOffset = width - $thumbOffset;

		windowWidth.set(windowSizeMinusOffset);
		windowHeight.set(height);
		console.log('fitTo window resize:', windowSizeMinusOffset, 'width:', width, 'height:', height);
	}
</script>

<main class="flex flex-col w-screen h-screen max-h-screen max-w-screen overflow-hidden">
	<div class="upper flex flex-basis-2/3 flex-col flex-1 max-h-[66%]">
		<div class="header">
			<Header></Header>
		</div>
		<!-- max height is the full height minus the height of the preview controls (+ padding) -->
		<div class="flex flex-1 shrink-0 max-h-[calc(100%-64px)]">
			<div class="flex-1 py-4 pr-4 workbench basis-1/3">
				<MediaPool></MediaPool>
			</div>
			<!-- max height is the full height minus the height of the preview controls -->
			<div class="flex-1 py-4 preview basis-2/3 max-h-[calc(100%-32px)]">
				<Preview></Preview>
			</div>
		</div>
	</div>
	<div class="timeline flex-1 basis-1/3 h-[33%] max-h-[34%] min-h-[33%]">
		<Timeline></Timeline>
	</div>
</main>

<!-- TODO: check if its worth to refactor into a function that adds the overlay and the component in it dynamically -->
<Overlay>
	<ExportDialog open={$exportOverlayOpen} />
</Overlay>

<Overlay>
	<AboutDialog open={$aboutOverlayOpen} />
</Overlay>

<Overlay>
	<RestoreStateDialog open={$restoreStateOverlayOpen} />
</Overlay>

<svelte:window on:resize={() => onWindowResize(innerWidth, innerHeight)} />

<!-- preload images -->
<!-- TODO: check its possible to remove the warnings in the console caused by the preload -->
<svelte:head>
	{#each preloadImageUrls as image}
		<link rel="preload" as="image" href={image} />
	{/each}
</svelte:head>
