<script lang="ts">
	import { handleFileUpload } from '$lib/utils/file.utils';
	import { isDraggedElementFromMediaPool } from '$lib/utils/utils';
	import { availableMedia } from '../../../stores/store';
	import MediaPoolElement from './MediaPoolElement.svelte';
	import MediaUpload from './MediaUpload.svelte';

	let hoverFile = false;

	async function onDropFile(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();

		hoverFile = false;

		// get file(s) from drop
		const files = e.dataTransfer?.files;

		// only handle files when actually dropped
		if (files && files.length > 0 && e.type !== 'dragleave') {
			await handleFileUpload(files);
		}
	}

	function onHoverLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();

		hoverFile = false;
	}

	function onHoverFile(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();

		// don't highlight media pool if element from media pool is hovered
		if (isDraggedElementFromMediaPool(e.dataTransfer)) {
			return;
		}

		hoverFile = true;
	}
</script>

<div
	class="h-full mediapool-container bg-background-highlight rounded-r-xl p-4 relative"
	on:drop={onDropFile}
	on:dragleave={onHoverLeave}
	on:dragenter={onHoverFile}
	on:dragover={onHoverFile}
	role="none"
>
	<div
		class="absolute rounded outline-dashed outline-hover-outline bg-hover-stipes inset-4"
		style="opacity: {hoverFile ? '1' : '0'};"
	></div>

	{#if $availableMedia && $availableMedia.length !== 0}
		<div class="flex flex-row flex-wrap content-start h-full gap-4 overflow-y-auto mediapool z-10">
			{#each $availableMedia as media, i (media.mediaId)}
				<MediaPoolElement file={media} index={i}></MediaPoolElement>
			{/each}
		</div>
	{:else}
		<!-- No media added yet -->
		<MediaUpload></MediaUpload>
	{/if}
</div>
