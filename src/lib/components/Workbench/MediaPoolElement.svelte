<script lang="ts">
	import type { IMedia } from '$lib/interfaces/Media';
	import { CONSTS } from '$lib/utils/consts';
	import { formatTime } from '$lib/utils/utils';
	import DeleteIcon from '$lib/assets/workbench/delete.png';
	import { fade } from 'svelte/transition';
	import { availableMedia } from '../../../stores/store';

	export let file: IMedia;
	export let index: number;

	let elementRef: HTMLElement;
	let isHovering = false;
	let previewImageRef: Element;

	// handle on drag start
	function onDragElement(e: DragEvent) {
		// stringify file data to pass it via drag and drop
		e.dataTransfer?.setData(CONSTS.mediaPoolTransferKey, JSON.stringify(file));

		// create temporary image element that holds the drag image
		const img = new Image();
		img.src = file.previewImage;

		// manually set the drag image so it loads directly when dragging
		e.dataTransfer?.setDragImage(
			img,
			// center the drag image
			CONSTS.mediaPoolElementWidth / 2,
			CONSTS.mediaPoolElementHeight / 2
		);
	}

	// delete current element in the store value
	function deleteElement() {
		availableMedia.update((media) => media.toSpliced(index, 1));
	}
</script>

<div class="flex flex-col items-center element-container">
	<div
		class="media relative rounded-lg p-[1px] bg-background-media-pool-element border-accent-color border cursor-pointer"
		style="width: {CONSTS.mediaPoolElementWidth}px; height: {CONSTS.mediaPoolElementHeight}px;"
		draggable="true"
		on:dragstart={onDragElement}
		on:mouseenter={() => (isHovering = true)}
		on:mouseleave={() => (isHovering = false)}
		bind:this={elementRef}
	>
		{#if file.loaded}
			<!-- show preview image when finished loading -->
			<img
				src={file.previewImage}
				alt="media preview"
				class="w-full h-full rounded-[6px]"
				bind:this={previewImageRef}
			/>
		{:else}
			<!-- else show loading background -->
			<div
				class="w-full h-full rounded-[6px] bg-hover-stipes animate-loadingStripes bg-[length:300%_200%]"
			></div>
		{/if}

		<!-- if the file has a duration show it in the element -->
		{#if file.duration}
			<span
				class="absolute bottom-2 left-2 font-medium text-xxs bg-background-media-pool-time pb-[1px] px-1 rounded opacity-80"
				>{formatTime(file.duration)}</span
			>
		{/if}

		<!-- only show the delete button if mouse is hovered over media element -->
		{#if isHovering}
			<button
				transition:fade={{ duration: 100 }}
				on:click={deleteElement}
				class="cursor-pointer rounded hover:opacity-100 absolute top-2 right-2 bg-background-media-pool-time p-1 opacity-80"
			>
				<img src={DeleteIcon} alt="delete media" width="14" />
			</button>
		{/if}
	</div>
	<span class="h-auto mt-1 text-xxs font-medium text-text-media-pool-time truncate w-[128px]"
		>{file.name}</span
	>
</div>
