<script lang="ts">
	import type { IMedia } from '$lib/interfaces/Media';
	import { CONSTS } from '$lib/utils/consts';
	import { msToHr } from '$lib/utils/utils';

	export let file: IMedia;

	let elementRef: HTMLElement;

	// attach necessary information to dataTransfer object
	function onDragElement(e: DragEvent) {
		// console.log('drag element -> e', e, 'media data:', file);

		// stringify file data to pass it via drag and drop
		e.dataTransfer?.setData(CONSTS.mediaPoolTransferKey, JSON.stringify(file));
		e.dataTransfer?.setData('text', 'placeholderText');
		// console.log('drag element after setData -> e', e.dataTransfer);
	}
	function onDragged(e: DragEvent) {
		const clientRect = elementRef.getBoundingClientRect();
		// console.log('onDragged -> e:', e, 'elementRef:', elementRef, 'clientRect:', clientRect);
	}
</script>

<div class="flex flex-col items-center element-container">
	<div
		class="media relative rounded-lg p-[1px] bg-background-color-light border-accent-color border"
		style="width: {CONSTS.mediaPoolElementWidth}px; height: {CONSTS.mediaPoolElementHeight}px;"
		draggable="true"
		on:dragstart={onDragElement}
		on:drag={onDragged}
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
	</div>
	<!-- <div class="inline-block w-[128px]"> -->
	<span class="h-auto mt-1 text-xxs font-medium text-text-color-darker truncate w-[128px]"
		>{file.name}</span
	>
	<!-- </div> -->
</div>
