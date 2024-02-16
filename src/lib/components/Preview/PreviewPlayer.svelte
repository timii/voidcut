<script lang="ts">
	import { MediaType } from '$lib/interfaces/Media';
	import type { IPlayerElement } from '$lib/interfaces/Player';
	import type { ITimelineElement, ITimelineTrack } from '$lib/interfaces/Timeline';
	import { availableMedia, previewPlaying, timelineTracks } from '../../../stores/store';

	$: timelineElements = flattenTimelineTracks($timelineTracks);

	// map to hold references to each player element and its properties using its elementId as a key
	// const playerElementsMap = new Map<string, { el: HTMLElement; properties: HTMLElement }>();
	let playerElementsMap: { [x: string]: { el: HTMLElement; properties: IPlayerElement } } = {};
	$: console.log('playerElementsMap:', playerElementsMap);

	// handle playing and pausing elements when the previewPlaying store value change
	$: handlePlayingElements($previewPlaying);

	function handlePlayingElements(playing: boolean) {
		console.log(
			'handlePlayingElements -> playing:',
			playing,
			'playerElementsMap[0]:',
			playerElementsMap[0],
			typeof playerElementsMap[0]
		);
	}

	// create a flattened array of timeline elements from a given array of tracks
	function flattenTimelineTracks(arr: ITimelineTrack[]): IPlayerElement[] {
		// console.log('flattenTimelineTracks -> arr before:', arr);

		// go through each track, return the flattened elements array and flatten the end result after all tracks have been iterated through so we end up with a flat array of all elements in all tracks
		const flatArr = arr.flatMap((track) =>
			track.elements.flatMap((el) => {
				// lookup media from availableMedia array in store using mediaId and get src property
				const foundEl = $availableMedia.find((media) => media.mediaId === el.mediaId);
				if (!foundEl) {
					return el;
				}
				const playerEl = { src: foundEl.src, ...el } as IPlayerElement;
				console.log(
					'flattenTimelineTracks -> playerEl:',
					playerEl,
					'playerElementsMap:',
					playerElementsMap
				);

				// add the media properties to the map using the elementId as the key
				playerElementsMap[playerEl.elementId] = {
					...playerElementsMap[playerEl.elementId],
					properties: playerEl
				};
				return playerEl;
			})
		);
		// console.log('flattenTimelineTracks -> arr after:', flatArr);

		return flatArr.length > 0 ? flatArr : [];
	}
</script>

<div class="preview-player bg-black h-full w-full relative">
	<!-- for each element in the timeline show a video/audio/image element -->
	{#each timelineElements as element, i}
		{#if element.type === MediaType.Video}
			<video
				data-id={element.elementId}
				preload="auto"
				controls
				class="h-full w-full absolute top-0 left-0"
				bind:this={playerElementsMap[element.elementId].el}
			>
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
