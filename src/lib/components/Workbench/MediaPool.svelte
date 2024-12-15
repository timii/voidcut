<script lang="ts">
	import { handleFileUpload } from '$lib/utils/utils';
	import { availableMedia } from '../../../stores/store';
	import MediaPoolElement from './MediaPoolElement.svelte';
	import MediaUpload from './MediaUpload.svelte';

	let hoverFile = false;

	async function onDropFile(e: DragEvent) {
		// console.log('media dropped:', e, 'dataTransfer:', e.dataTransfer);

		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();

		hoverFile = false;

		// get file(s) from drop
		const files = e.dataTransfer?.files;

		// only handle files when actually dropped
		if (files && files.length > 0 && e.type !== 'dragleave') {
			console.log('media dropped in if:', e, 'dataTransfer:', e.dataTransfer, 'files:', files);
			await handleFileUpload(files);
		}
	}

	function onHoverFile(e: DragEvent) {
		// console.log('hover media:', e);

		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverFile = true;
	}
</script>

<div
	class="mediapool-container h-full"
	on:drop={onDropFile}
	on:dragleave={onDropFile}
	on:dragenter={onHoverFile}
	on:dragover={onHoverFile}
	style="background-color: {hoverFile ? '#2e2e35' : ''};"
>
	{#if $availableMedia && $availableMedia.length !== 0}
		<div class="mediapool flex flex-row flex-wrap overflow-y-auto h-full content-start gap-2">
			{#each $availableMedia as media, i}
				<MediaPoolElement file={media} index={i}></MediaPoolElement>
			{/each}
		</div>
	{:else}
		<!-- No media added yet -->
		<MediaUpload></MediaUpload>
	{/if}
</div>
