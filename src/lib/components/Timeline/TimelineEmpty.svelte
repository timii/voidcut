<script lang="ts">
	import { isDraggedElementAFile } from '$lib/utils/utils';

	let hoverFile = false;

	function onHoverLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		hoverFile = false;
	}

	function onHoverFile(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();

		// don't highlight the timeline if a file is hovered over
		if (isDraggedElementAFile(e.dataTransfer?.items)) {
			return;
		}

		hoverFile = true;
	}
</script>

<div
	class="w-full h-full flex flex-col items-center justify-center border-ruler-color border-t-2 relative"
	on:dragleave={onHoverLeave}
	on:dragenter={onHoverFile}
	on:dragover={onHoverFile}
>
	<div class="text-center z-10">
		Add media to the timeline to start creating your video!
		<div class="text-sm italic text-text-info">
			(Hint: You can add elements by dragging your added media files here)
		</div>
	</div>
	<div
		class="absolute rounded outline-dashed outline-hover-outline bg-hover-stipes inset-4"
		style="opacity: {hoverFile ? '1' : '0'};"
	></div>
</div>
