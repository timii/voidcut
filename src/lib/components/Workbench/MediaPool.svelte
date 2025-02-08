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

	function onHoverLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();

		hoverFile = false;
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
	class="h-full mediapool-container bg-background-highlight rounded-r-xl p-4"
	on:drop={onDropFile}
	on:dragleave={onHoverLeave}
	on:dragenter={onHoverFile}
	on:dragover={onHoverFile}
	style="background-color: {hoverFile ? '#2e2e35' : ''};"
>
	{#if $availableMedia && $availableMedia.length !== 0}
		<div class="flex flex-row flex-wrap content-start h-full gap-4 overflow-y-auto mediapool">
			{#each $availableMedia as media, i (media.mediaId)}
				<MediaPoolElement file={media} index={i}></MediaPoolElement>
			{/each}
		</div>
	{:else}
		<!-- No media added yet -->
		<MediaUpload></MediaUpload>
	{/if}
</div>
