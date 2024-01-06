<script lang="ts">
	import { MediaType } from '$lib/interfaces/Media';
	import type { ITimelineElement, ITimelineTrack } from '$lib/interfaces/Timeline';
	import { timelineTracks } from '../../../stores/store';

	// create a flattened array of timeline elements from the array of tracks
	$: timelineElements = flattenTimelineTracks($timelineTracks);

	function flattenTimelineTracks(arr: ITimelineTrack[]): ITimelineElement[] {
		console.log('flattenTimelineTracks -> arr before:', arr);

		// go through each track, return the flattened elements array and flatten the end result after all tracks have been iterated through
		const flatArr = arr.flatMap((track) => track.elements.flat());
		console.log('flattenTimelineTracks -> arr after:', flatArr);

		return flatArr.length > 0 ? flatArr : [];
	}
</script>

<div class="preview-player bg-black h-full w-full">
	<!-- for each element in the timeline show a video/audio/image element -->
	{#each timelineElements as element}
		{#if element.type === MediaType.Video}
			<div class="video"></div>
		{:else if element.type === MediaType.Audio}
			<div class="audio"></div>
		{:else}
			<div class="image"></div>
		{/if}
	{/each}
</div>
