<script lang="ts">
	import { currentTimelineScale, selectedElement } from '../../../stores/store';
	import IconButton from '../shared/IconButton.svelte';
	import DeleteIcon from '$lib/assets/timeline/delete.png';
	function deleteSelectedElement() {
		console.log('deleteSelectedElement clicked -> selectedElement:', $selectedElement);
	}
</script>

<div class="timeline-controls flex flex-row p-1 border">
	<div class="flex-1">
		<IconButton
			onClickCallback={deleteSelectedElement}
			icon={DeleteIcon}
			alt={'Delete selected element'}
			size={20}
		></IconButton>
		<!-- <div class="increase-scale cursor-pointer" on:click={deleteSelectedElement}>+</div> -->
	</div>
	<div class="flex-1 text-center">time</div>
	<div class="flex-1 text-right">
		<div class="flex gap-3 justify-end mr-12 text-lg">
			<div class="increase-scale cursor-pointer" on:click={increaseTimelineScale}>+</div>
			<div class="decrease-scale cursor-pointer" on:click={decreaseTimelineScale}>-</div>
		</div>
	</div>
</div>
