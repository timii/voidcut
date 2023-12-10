<script lang="ts">
	import Timeline from '$lib/components/Timeline/Timeline.svelte';
	import MediaPool from '$lib/components/Workbench/MediaPool.svelte';
	import { availableMedia } from '../stores/store';

	let hoverMedia = false;

	function onDropMedia(e: DragEvent) {
		console.log('media dropped:', e, 'dataTransfer:', e.dataTransfer);

		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();

		hoverMedia = false;

		// get file(s) from drop
		let files = e.dataTransfer?.files;
		if (files) {
			handleFiles(files);
		}
	}

	function onHoverMedia(e: DragEvent) {
		console.log('hover media:', e);

		// prevent default behavior
		e.preventDefault();
		e.stopPropagation();
		hoverMedia = true;
	}

	function handleFiles(files: FileList) {
		// convert FileList type to an array
		let filesArr = [...files];

		// save dropped file(s) into store
		availableMedia.update((arr) => [...arr, ...filesArr]);
	}
</script>

<main class="grid h-screen w-screen gap-1">
	<div
		class="workbench border-2 p-4 row-span-2"
		on:drop={onDropMedia}
		on:dragleave={onDropMedia}
		on:dragenter={onHoverMedia}
		on:dragover={onHoverMedia}
		style="background-color: {hoverMedia ? '#2e2e35' : ''};"
	>
		<MediaPool></MediaPool>
	</div>
	<div class="preview border-2 p-4 row-span-2 col-span-2">preview</div>
	<div class="timeline border-2 p-4 col-span-3">
		<Timeline></Timeline>
	</div>
</main>
