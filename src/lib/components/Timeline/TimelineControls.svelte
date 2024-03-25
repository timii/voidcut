<script lang="ts">
	import { currentTimelineScale, selectedElement, timelineTracks } from '../../../stores/store';
	import IconButton from '../shared/IconButton.svelte';
	import DeleteIcon from '$lib/assets/timeline/delete.png';
	import { get } from 'svelte/store';
	import type { ITimelineTrack } from '$lib/interfaces/Timeline';
	import { getIndexOfElementInTracks } from '$lib/utils/utils';
	function deleteSelectedElement() {
		console.log(
			'deleteSelectedElement clicked -> selectedElement:',
			$selectedElement,
			'timelineTracks:',
			$timelineTracks
		);
		const indeces = getIndexOfElementInTracks();
		if (!indeces) {
			return;
		}
		console.log('deleteSelectedElement -> indeces found:', indeces);
		const firstIndex = indeces[0];
		const secondIndex = indeces[1];
		timelineTracks.update((tracks) => {
			// if there is only one element on the track, remove the whole track
			if (tracks[firstIndex].elements.length === 1) {
				return tracks.toSpliced(firstIndex, 1);
			}
			// else remove the specific element from the elements on the track
			else {
				const trackAfterRemoval = tracks[firstIndex].elements.toSpliced(secondIndex, 1);
				tracks[firstIndex].elements = trackAfterRemoval;
				return tracks;
			}
		});
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
