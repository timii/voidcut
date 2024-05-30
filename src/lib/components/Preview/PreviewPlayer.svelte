<script lang="ts">
	import { MediaType } from '$lib/interfaces/Media';
	import type { IPlayerElement, IPlayerElementsMap } from '$lib/interfaces/Player';
	import type { ITimelineElement, ITimelineTrack } from '$lib/interfaces/Timeline';
	import { CONSTS } from '$lib/utils/consts';
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

	// handle playing and pausing elements when the previewPlaying store value changes
	$: handlePlayingElements($previewPlaying);

	// handle playing and pausing elements when the currentPlaybackTime store value changes
	$: test($currentPlaybackTime);

	function test(playbackTime: number) {
		console.log(
			'currentPlaybackTime change in player -> playbackTime:',
			playbackTime,
			'map:',
			playerElementsMap
		);

		const playing = $previewPlaying;
		if (!playing) {
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

			const curPlaybackTime = $currentPlaybackTime;
			// TODO: check if current element is within the playback time
			const beforeElStart = curPlaybackTime < el.properties.playbackStartTime;
			const afterElEnd =
				curPlaybackTime >= el.properties.playbackStartTime + el.properties.duration;
			const atElTime = !beforeElStart && !afterElEnd;
			const isVideoPlaying = !htmlEl.paused;
			const curElTime =
				($currentPlaybackTime - el.properties.playbackStartTime) / CONSTS.secondsMultiplier;
			const elTimeOutOfSync =
				curElTime < htmlEl.currentTime - 0.2 || curElTime > htmlEl.currentTime + 0.2;

			// if media element time and playback time are out of sync
			if (elTimeOutOfSync) {
				htmlEl.currentTime = curElTime;
			}

			console.log(
				'currentPlaybackTime change in player -> elTimeOutOfSync:',
				elTimeOutOfSync,
				'atElTime:',
				atElTime,
				'isVideoPlaying:',
				isVideoPlaying,
				'curElTime:',
				curElTime,
				'htmlEl.currentTime:',
				htmlEl.currentTime
			);

			if (!atElTime) {
				if (isVideoPlaying) htmlEl.pause();
				return;
			}

			if (!isVideoPlaying) {
				htmlEl.play();
			}

			// playing ? htmlEl.play() : htmlEl.pause();
		});
	}

	// TODO: not implemented
	function handlePlayingElements(playing: boolean) {
		console.log(
			'handlePlayingElements -> playing:',
			playing,
			'map:',
			playerElementsMap,
			'$currentPlaybackTime:',
			$currentPlaybackTime
		);
		Object.values(playerElementsMap).forEach((el) => {
			// ignore image elements
			if (el.properties.type === MediaType.Image) {
				return;
			}
			console.log('in for each map -> el:', el);
			// TODO: check if current element is within the playback time

			// type the el property to get correct typing
			const htmlEl = el.el as HTMLMediaElement;
			// take the element offset in the timeline into consideration
			const currentElTime = $currentPlaybackTime - el.properties.playbackStartTime;
			console.log('in for each map -> currentElTime:', currentElTime);
			if (currentElTime >= 0) {
				// set currentTime of element to current playback time (in seconds)
				htmlEl.currentTime = currentElTime / CONSTS.secondsMultiplier;
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

	// Check if given element should be displayed or not
	function displayMediaElement(time: number, el: IPlayerElement) {
		return time - el.playbackStartTime >= 0 && time - el.playbackStartTime <= el.duration
			? 'unset'
			: 'none';
	}
</script>

<div class="relative w-full h-full bg-black preview-player">
	<!-- for each element in the timeline show a video/audio/image element -->
	{#each timelineElements as element, i}
		{#if element.type === MediaType.Video}
			<video
				data-id={element.elementId}
				preload="auto"
				controls
				class="absolute top-0 left-0 w-full h-full pointer-events-none"
				style="display: {displayMediaElement(
					$currentPlaybackTime,
					element
				)}; z-index:{timelineElements.length - i};"
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
