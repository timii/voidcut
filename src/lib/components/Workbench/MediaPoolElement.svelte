<script lang="ts">
	import type { IMedia } from '$lib/interfaces/Media';
	import { CONSTS } from '$lib/utils/consts';
	import { msToHr } from '$lib/utils/utils';
	import DeleteIcon from '$lib/assets/workbench/delete.png';
	import { fade } from 'svelte/transition';
	import { availableMedia } from '../../../stores/store';

	export let file: IMedia;
	export let index: number;

	let elementRef: HTMLElement;
	let isHovering = false;

	// attach necessary information to dataTransfer object
	function onDragElement(e: DragEvent) {
		// console.log('drag element -> e', e, 'media data:', file);

		// stringify file data to pass it via drag and drop
		e.dataTransfer?.setData(CONSTS.mediaPoolTransferKey, JSON.stringify(file));
		e.dataTransfer?.setData('text', 'placeholderText');
		// console.log('drag element after setData -> e', e.dataTransfer);
	}

	// delete current element in the store value
	function deleteElement() {
		availableMedia.update((media) => media.toSpliced(index, 1));
	}
</script>

<div class="flex flex-col items-center element-container">
	<div
		class="media relative rounded-lg p-[1px] bg-background-color-light border-accent-color border cursor-pointer"
		style="width: {CONSTS.mediaPoolElementWidth}px; height: {CONSTS.mediaPoolElementHeight}px;"
		draggable="true"
		on:dragstart={onDragElement}
		on:mouseenter={() => (isHovering = true)}
		on:mouseleave={() => (isHovering = false)}
		bind:this={elementRef}
	>
		<img src={file.previewImage} alt="media preview" class="w-full h-full rounded-[6px]" />

		<!-- if the file has a duration show it in the element -->
		{#if file.duration}
			<span
				class="absolute bottom-2 left-2 font-medium text-xxs bg-background-color pb-[1px] px-1 rounded opacity-80"
				>{msToHr(file.duration)}</span
			>
		{/if}

		<!-- only show the delete button if mouse is hovered over media element -->
		{#if isHovering}
			<button
				transition:fade={{ duration: 100 }}
				on:click={deleteElement}
				class="cursor-pointer rounded hover:opacity-100 absolute top-2 right-2 bg-background-color p-1 opacity-80"
			>
				<img src={DeleteIcon} alt="delete media" width="14" />
			</button>
		{/if}
	</div>
	<span class="h-auto mt-1 text-xxs font-medium text-text-color-darker truncate w-[128px]"
		>{file.name}</span
	>
</div>
