<script lang="ts">
	import { MediaType } from '$lib/interfaces/Media';
	import type { IPlayerElement, IPlayerElementsMap } from '$lib/interfaces/Player';
	import type { ITimelineElement, ITimelineTrack } from '$lib/interfaces/Timeline';
	import { CONSTS } from '$lib/utils/consts';
	import { getCurrentMediaTime, isPlaybackInElement } from '$lib/utils/utils';
	import {
		availableMedia,
		currentPlaybackTime,
		previewPlaying,
		timelineTracks
	} from '../../../stores/store';

	$: timelineElements = flattenTimelineTracks($timelineTracks);

	// map to hold references to each player element and its properties using its elementId as a key
	// const playerElementsMap = new Map<string, { el: HTMLElement; properties: HTMLElement }>();
	let playerElementsMap: IPlayerElementsMap = {};
	$: filterPlayerElementsMap(playerElementsMap);

	// handle playing and pausing elements when the playback is being paused/played store value changes
	$: handlePlayingElements($previewPlaying);

	// handle playing and pausing elements when the currentPlaybackTime store value changes
	$: handlePlaybackTimeUpdate($currentPlaybackTime);

	// handles what elements need to be updated while playback is running
	function handlePlaybackTimeUpdate(playbackTime: number) {
		// if the playback time is being updated but the playback isn't running we return here
		if (!$previewPlaying) {
			return;
		}

		// for each update of the playback time go through the whole map and check if the element
		// needs to be played or paused
		Object.values(playerElementsMap).forEach((el) => {
			// ignore image elements
			if (el.properties.type === MediaType.Image) {
				return;
			}
			console.log('in for each map -> el:', el);

			// type the el property to get correct typing
			const htmlEl = el.el as HTMLMediaElement;

			const isMediaPlaying = !htmlEl.paused;

			// get the time from where the media element should be played at
			const currentElTime = getCurrentMediaTime(el.properties);

			// check if the element is out of sync while the playbakc is running
			const elTimeOutOfSync =
				currentElTime < htmlEl.currentTime - 0.2 || currentElTime > htmlEl.currentTime + 0.2;

			// if media element time and playback time are out of sync update the media time
			if (elTimeOutOfSync) {
				htmlEl.currentTime = currentElTime;
			}

			console.log(
				'currentPlaybackTime change in player -> elTimeOutOfSync:',
				elTimeOutOfSync,
				'atElTime:',
				isPlaybackInElement(el.properties),
				'isMediaPlaying:',
				isMediaPlaying,
				'curElTime:',
				currentElTime,
				'htmlEl.currentTime:',
				htmlEl.currentTime
			);

			// check if the playback time is within the element start and end time on the timeline
			if (!isPlaybackInElement(el.properties)) {
				// if the playback time is outside element bounds and the media is still playing we pause it
				if (isMediaPlaying) htmlEl.pause();
				return;
			}

			if (!isMediaPlaying) {
				htmlEl.play();
			}
		});
	}

	// handles what elements need to be updated when pausing/resuming playback
	function handlePlayingElements(playing: boolean) {
		console.log(
			'handlePlayingElements -> playing:',
			playing,
			'map:',
			playerElementsMap,
			'$currentPlaybackTime:',
			$currentPlaybackTime
		);

		// everytime the playback is being started/paused, go through the whole map and check what elements
		// needs to be played or paused
		Object.values(playerElementsMap).forEach((el) => {
			// ignore image elements
			if (el.properties.type === MediaType.Image) {
				return;
			}

			// type the el property to get correct typing
			const htmlEl = el.el as HTMLMediaElement;

			// get the time from where the media element should be played at
			const currentElTime = getCurrentMediaTime(el.properties);

			// check if we are withing bounds of the element
			if (currentElTime >= 0 && isPlaybackInElement(el.properties)) {
				// set currentTime of element to current playback time (in seconds)
				htmlEl.currentTime = currentElTime;

				// play/pause the element depending the "previewPlaying" store value
				playing ? htmlEl.play() : htmlEl.pause();
			}
		});
	}

	// filter the given map by removing keys where the "el" property in the value is null
	function filterPlayerElementsMap(map: IPlayerElementsMap) {
		// console.log(
		// 	'filterPlayerElementsMap -> playerElementsMap changes before:',
		// 	JSON.parse(JSON.stringify(playerElementsMap))
		// );
		// loop through map and filter out elements where the element is null
		for (const [key, value] of Object.entries(map)) {
			console.log('in for loop -> key:', key, 'value:', value, 'el is null?:', value.el === null);
			if (value.el === null) {
				delete playerElementsMap[key];
			}
		}
		console.log(
			'filterPlayerElementsMap -> playerElementsMap changes after:',
			JSON.parse(JSON.stringify(playerElementsMap))
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
				// console.log('flattenTimelineTracks -> playerEl:', playerEl);
				// console.log(
				// 	'flattenTimelineTracks -> playerElementsMap before:',
				// 	JSON.parse(JSON.stringify(playerElementsMap))
				// );

				// if key with matching element id exists, add the media properties to the value
				playerElementsMap[playerEl.elementId] = {
					...playerElementsMap[playerEl.elementId],
					properties: playerEl
				};

				// console.log(
				// 	'flattenTimelineTracks -> playerElementsMap after:',
				// 	JSON.parse(JSON.stringify(playerElementsMap))
				// );
				return playerEl;
			})
		);
		console.log('flattenTimelineTracks -> arr after:', flatArr);

		return flatArr.length > 0 ? flatArr : [];
	}

	// calculate if given element should be displayed or not by checking if the current playback time is within the element time on the timeline
	function displayMediaElement(time: number, el: IPlayerElement) {
		return time - el.playbackStartTime >= 0 && time - el.playbackStartTime <= el.duration
			? 'unset'
			: 'none';
	}
</script>

<div class="relative w-full h-full bg-black preview-player">
	<!-- for each element in the timeline show a video/audio/image element -->
	{#each timelineElements as element, i (element.elementId)}
		{#if element.type === MediaType.Video}
			<!-- TODO: hide controls at the end when everything works -->
			<video
				data-id={element.elementId}
				data-duration={element.duration}
				preload="auto"
				controls
				class="absolute top-0 left-0 w-full h-full pointer-events-none"
				style="display: {displayMediaElement(
					$currentPlaybackTime,
					element
				)}; z-index:{timelineElements.length - i};"
				src={element.src}
				bind:this={playerElementsMap[element.elementId].el}
			>
			</video>
		{:else if element.type === MediaType.Audio}
			<!-- TODO: hide controls at the end when everything works -->
			<audio
				data-id={element.elementId}
				data-duration={element.duration}
				preload="auto"
				controls
				class="absolute top-0 left-0 w-full h-full pointer-events-none"
				style="display: {displayMediaElement(
					$currentPlaybackTime,
					element
				)}; z-index:{timelineElements.length - i};"
				src={element.src}
				bind:this={playerElementsMap[element.elementId].el}
			></audio>
		{:else if element.type === MediaType.Image}
			<img
				src={element.src}
				alt=""
				bind:this={playerElementsMap[element.elementId].el}
				style="display: {displayMediaElement(
					$currentPlaybackTime,
					element
				)}; z-index:{timelineElements.length - i};"
				class="absolute top-0 left-0 w-full h-full pointer-events-none"
				data-id={element.elementId}
			/>
		{:else}
			<!-- default case that should not be reached usually -->
			<div class="no-matching-element-type"></div>
		{/if}
	{/each}
</div>
