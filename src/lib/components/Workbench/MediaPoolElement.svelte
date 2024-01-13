<script lang="ts">
	import type { IMedia } from '$lib/interfaces/Media';

	export let file: IMedia;

	// attach necessary information to dataTransfer object
	function onDragElement(e: DragEvent) {
		console.log('drag element -> e', e, 'media data:', file);

		// stringify file data to pass it via drag and drop
		e.dataTransfer?.setData('media-data', JSON.stringify(file));
		e.dataTransfer?.setData('text', 'placeholderText');
		console.log('drag element after setData -> e', e.dataTransfer);
	}
</script>

<div
	class="element-container flex flex-col items-center"
	draggable="true"
	on:dragstart={onDragElement}
>
	<div class="media h-24 w-32 rounded bg-red-500"></div>
	<span>{file.name}</span>
</div>
