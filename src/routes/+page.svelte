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
	import {
		initPersistenceWorker,
		isLastStateAvailableInStorage,
		restoreLastState,
		setupBackupInterval
	} from '$lib/utils/persistence.utils';
	import RestoreStateDialog from '$lib/components/persistence/RestoreStateDialog.svelte';

	// import icons directly so the path is resolved correctly after building
	import CloseIcon from '$lib/assets/header/close.png';
	import CompleteIcon from '$lib/assets/header/complete.png';
	import ErrorIcon from '$lib/assets/header/error.png';
	import ExportIcon from '$lib/assets/header/export.png';
	import DownloadIcon from '$lib/assets/header/download.png';
	import CancelIcon from '$lib/assets/header/cancel.png';
	import GitHubIcon from '$lib/assets/header/github.png';
	import PauseIcon from '$lib/assets/preview/pause.png';
	import DeleteIcon from '$lib/assets/workbench/delete.png';
	import UploadIcon from '$lib/assets/workbench/upload.png';
	import { CONSTS } from '$lib/utils/consts';

	// list of images/icons that should be preloaded
	const preloadImageUrls = [
		CloseIcon,
		CompleteIcon,
		ErrorIcon,
		ExportIcon,
		DownloadIcon,
		CancelIcon,
		GitHubIcon,
		PauseIcon,
		DeleteIcon,
		UploadIcon
	];

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

		// initialize the web worker for the persistence utils
		initPersistenceWorker();

		// setup and start the interval for locally backing up the state
		await setupBackupInterval();

		const stateAvailable = await isLastStateAvailableInStorage();
		console.log('[BACKUP] stateAvailable:', stateAvailable);

		// if there is a saved state in local storage, restore it
		if (stateAvailable) {
			// show dialog while last state is being restored
			restoreStateOverlayOpen.set(true);
			await restoreLastState();
		}

		// preload all images defined above
		await preloadImages();
	});

	// manually use all defined icons for preload to avoid warnings in console that they are not being used
	async function preloadImages() {
		for (const image of preloadImageUrls) {
			const img = new Image();
			img.src = image;
			img.onload = () => {};
		}
	}

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
			<div
				class="flex-1 py-4 pr-4 workbench basis-1/3"
				style="
					--extraSmallScreen: {CONSTS.workbenchWidthXS}px;
					--smallScreen: {CONSTS.workbenchWidthS}px;
					--mediumScreen: {CONSTS.workbenchWidthM}px; 
					--largeScreen: {CONSTS.workbenchWidthL}px;
				"
			>
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
<svelte:head>
	{#each preloadImageUrls as image}
		<link rel="preload" as="image" href={image} />
	{/each}
</svelte:head>

<style lang="postcss">
	/* extra small screens */
	@media only screen and (max-width: 700px) {
		.workbench {
			min-width: var(--extraSmallScreen);
			max-width: var(--extraSmallScreen);
		}
	}

	/* small screens */
	@media only screen and (min-width: 700px) and (max-width: 1300px) {
		.workbench {
			min-width: var(--smallScreen);
			max-width: var(--smallScreen);
		}
	}

	/* medium screens */
	@media only screen and (min-width: 1300px) and (max-width: 1600px) {
		.workbench {
			min-width: var(--mediumScreen);
			max-width: var(--mediumScreen);
		}
	}

	/* large screens */
	@media only screen and (min-width: 1600px) {
		.workbench {
			min-width: var(--largeScreen);
			max-width: var(--largeScreen);
		}
	}
</style>
