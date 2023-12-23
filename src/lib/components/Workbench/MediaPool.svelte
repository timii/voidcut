<script lang="ts">
	import { handleMediaUpload, saveFilesToStore } from '$lib/utils/utils';
	import { availableMedia } from '../../../stores/store';
	import MediaPoolElement from './MediaPoolElement.svelte';
	import MediaUpload from './MediaUpload.svelte';

	let hoverMedia = false;

	async function onDropMedia(e: DragEvent) {
		console.log('media dropped:', e, 'dataTransfer:', e.dataTransfer);

		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();

		hoverMedia = false;

		// get file(s) from drop
		let files = e.dataTransfer?.files;
		if (files) {
			handleMediaUpload(files);
		}
	}

	function onHoverMedia(e: DragEvent) {
		// console.log('hover media:', e);

		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverMedia = true;
	}
</script>

<div
	class="mediapool-container h-full"
	role="region"
	on:drop={onDropMedia}
	on:dragleave={onDropMedia}
	on:dragenter={onHoverMedia}
	on:dragover={onHoverMedia}
	style="background-color: {hoverMedia ? '#2e2e35' : ''};"
>
	{#if $availableMedia && $availableMedia.length !== 0}
		<div class="mediapool flex flex-row flex-wrap overflow-y-auto h-full content-start gap-2">
			{#each $availableMedia as media}
				<MediaPoolElement file={media}></MediaPoolElement>
			{/each}
		</div>
	{:else}
		<!-- No media added yet -->
		<MediaUpload></MediaUpload>
	{/if}
</div>
