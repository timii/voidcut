<script lang="ts">
	import type { IMedia } from '$lib/interfaces/Media';
	import { CONSTS } from '$lib/utils/consts';

	export let file: IMedia;

	// attach necessary information to dataTransfer object
	function onDragElement(e: DragEvent) {
		// console.log('drag element -> e', e, 'media data:', file);

		// stringify file data to pass it via drag and drop
		e.dataTransfer?.setData(CONSTS.mediaPoolTransferKey, JSON.stringify(file));
		e.dataTransfer?.setData('text', 'placeholderText');
		// console.log('drag element after setData -> e', e.dataTransfer);
	}
</script>

<div
	class="flex flex-col items-center element-container"
	draggable="true"
	on:dragstart={onDragElement}
>
	<div class="w-32 h-24 bg-red-500 rounded media"></div>
	<span>{file.name}</span>
</div>
