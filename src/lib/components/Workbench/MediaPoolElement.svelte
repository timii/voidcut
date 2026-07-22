<script lang="ts">
	import { MediaType, type IMedia } from '$lib/interfaces/Media';
	import { CONSTS } from '$lib/utils/consts';
	import DeleteIcon from '$lib/assets/workbench/delete.png';
	import { formatTime } from '$lib/utils/time.utils';
	import { deleteMediaFromProject } from '$lib/utils/media-actions.utils';

	export let file: IMedia;

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

	// handle deleting a media pool element
	function deleteElement() {
		// TODO: show a dialog before deleting it with a warning that the timeline elements will also be deleted
		deleteMediaFromProject(file.mediaId);
	}
</script>

<div class="flex flex-col items-center element-container">
	<div
		class="media relative rounded-lg p-[1px] border-accent-color border cursor-pointer"
		style="
			width: {CONSTS.mediaPoolElementWidth}px; 
			height: {CONSTS.mediaPoolElementHeight}px;
			background-color: {file.type === MediaType.Audio ? '#cc7000' : ''};
		"
		draggable="true"
		on:dragstart={onDragElement}
		on:mouseenter={() => (isHovering = true)}
		on:mouseleave={() => (isHovering = false)}
		bind:this={elementRef}
		role="none"
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

		<button
			on:click={deleteElement}
			class:pointer-events-none={!isHovering}
			class="cursor-pointer rounded hover:opacity-100 absolute top-2 right-2 bg-background-media-pool-time p-1 opacity-80 transition-opacity delete-button"
			style="opacity: {isHovering ? '0.8' : '0'};"
			tabindex={isHovering ? 0 : -1}
		>
			<img src={DeleteIcon} alt="delete media" width="14" />
		</button>
	</div>
	<span class="h-auto mt-1 text-xxs font-medium text-text-media-pool-time truncate w-[128px]"
		>{file.name}</span
	>
</div>
