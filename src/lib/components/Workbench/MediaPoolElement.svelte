<script lang="ts">
	import type { IMedia } from '$lib/interfaces/Media';
	import { CONSTS } from '$lib/utils/consts';

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
		class="rounded-lg bg-text-color media"
		style="width: {CONSTS.mediaPoolElementWidth}px; height: {CONSTS.mediaPoolElementHeight}px;"
		draggable="true"
		on:dragstart={onDragElement}
		on:drag={onDragged}
		bind:this={elementRef}
	>
		<img src={file.previewImage} alt="media preview" class="w-full h-full rounded-[inherit]" />
	</div>
	<span class="h-auto mt-1 text-xs font-medium text-text-color-darkest">{file.name}</span>
</div>
