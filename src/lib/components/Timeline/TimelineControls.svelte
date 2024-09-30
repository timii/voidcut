<script lang="ts">
	import {
		currentPlaybackTime,
		currentTimelineScale,
		selectedElement,
		timelineTracks
	} from '../../../stores/store';
	import IconButton from '../shared/IconButton.svelte';
	import DeleteIcon from '$lib/assets/timeline/delete.png';
	import IncreaseIcon from '$lib/assets/timeline/increase.png';
	import DecreaseIcon from '$lib/assets/timeline/decrease.png';
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
	</div>
	<div class="flex-1 text-center">{formatPlaybackTime($currentPlaybackTime)}</div>
	<div class="flex-1 text-right">
		<div class="flex justify-end gap-3 mr-12 text-lg">
			<IconButton
				onClickCallback={increaseTimelineScale}
				icon={IncreaseIcon}
				alt={'Increase timeline scale'}
				size={20}
			></IconButton><IconButton
				onClickCallback={decreaseTimelineScale}
				icon={DecreaseIcon}
				alt={'Decrease timeline scale'}
				size={20}
			></IconButton>
		</div>
	</div>
</div>
