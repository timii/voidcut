<script lang="ts">
	import type { ITimelineDraggedElement } from '$lib/interfaces/Timeline';
	import { draggedElement } from '../../../stores/store';

	let dividerRef: HTMLElement;

	$: isElementHovered($draggedElement);

	function isElementHovered(draggedEl: ITimelineDraggedElement | null) {
		if (!draggedEl) return;
		console.log('isElementHovered -> draggedEl', draggedEl);
	}
</script>

<div class="track-divider w-full bg-slate-500 h-[4px] rounded-sm" bind:this={dividerRef}></div>
