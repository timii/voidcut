<script lang="ts">
	import {
		currentPlaybackTime,
		currentTimelineScale,
		selectedElement,
		timelineTracks
	} from '../../../stores/store';
	import IconButton from '../shared/IconButton.svelte';
	import DeleteIcon from '$lib/assets/timeline/delete.png';
	import { get } from 'svelte/store';
	import type { ITimelineTrack } from '$lib/interfaces/Timeline';
	import { formatPlaybackTime, getIndexOfElementInTracks } from '$lib/utils/utils';

	function increaseTimelineScale() {
		currentTimelineScale.update((value) => value * 2);
		console.log('increaseTimelineScale -> currentTimelineScale:', $currentTimelineScale);
	}

	function decreaseTimelineScale() {
		currentTimelineScale.update((value) => value / 2);
		console.log(
			'increaseTimeldecreaseTimelineScaleineScale -> currentTimelineScale:',
			$currentTimelineScale
		);
	}

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

<div class="flex flex-row p-1 border timeline-controls">
	<div class="flex-1">
		<IconButton
			onClickCallback={deleteSelectedElement}
			icon={DeleteIcon}
			alt={'Delete selected element'}
			size={20}
		></IconButton>
		<!-- <div class="cursor-pointer increase-scale" on:click={deleteSelectedElement}>+</div> -->
	</div>
	<div class="flex-1 text-center">{formatPlaybackTime($currentPlaybackTime)}</div>
	<div class="flex-1 text-right">
		<div class="flex justify-end gap-3 mr-12 text-lg">
			<div class="cursor-pointer increase-scale" on:click={increaseTimelineScale}>+</div>
			<div class="cursor-pointer decrease-scale" on:click={decreaseTimelineScale}>-</div>
		</div>
	</div>
</div>
