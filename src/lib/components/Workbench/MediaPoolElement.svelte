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
		class="h-24 bg-red-500 rounded media"
		style="width: {CONSTS.mediaPoolElementWidth}px;"
		draggable="true"
		on:dragstart={onDragElement}
		on:drag={onDragged}
		bind:this={elementRef}
	></div>
	<span>{file.name}</span>
</div>
