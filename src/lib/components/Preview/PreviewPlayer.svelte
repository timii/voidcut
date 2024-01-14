<script lang="ts">
	import { MediaType } from '$lib/interfaces/Media';
	import type { IPlayerElement } from '$lib/interfaces/Player';
	import type { ITimelineElement, ITimelineTrack } from '$lib/interfaces/Timeline';
	import { availableMedia, timelineTracks } from '../../../stores/store';

	$: timelineElements = flattenTimelineTracks($timelineTracks);

	// create a flattened array of timeline elements from a given array of tracks
	function flattenTimelineTracks(arr: ITimelineTrack[]): IPlayerElement[] {
		console.log('flattenTimelineTracks -> arr before:', arr);

		// go through each track, return the flattened elements array and flatten the end result after all tracks have been iterated through
		const flatArr = arr.flatMap((track) =>
			track.elements.flatMap((el) => {
				// lookup media from availableMedia array in store using mediaId and get src property
				const foundEl = $availableMedia.find((media) => media.mediaId === el.mediaId);
				if (!foundEl) {
					return el;
				}
				console.log('flattenTimelineTracks -> el:', el, 'foundEl:', foundEl, 'src:', foundEl.src);
				return { src: foundEl.src, ...el };
			})
		);
		console.log('flattenTimelineTracks -> arr after:', flatArr);

		return flatArr.length > 0 ? flatArr : [];
	}
</script>

<div class="preview-player bg-black h-full w-full relative">
	<!-- for each element in the timeline show a video/audio/image element -->
	{#each timelineElements as element}
		{#if element.type === MediaType.Video}
			<!-- svelte-ignore a11y-media-has-caption -->
			<video preload="auto" controls class="h-full w-full absolute top-0 left-0">
				<source src={element.src} type="video/mp4" />
			</video>
			<!-- TODO: implement audio and image -->
		{:else if element.type === MediaType.Audio}
			<div class="audio"></div>
		{:else if element.type === MediaType.Image}
			<div class="image"></div>
			<!-- default case that should not be reached usually -->
		{:else}
			<div class="no-matching-element-type"></div>
		{/if}
	{/each}
</div>
