<script lang="ts">
	import { MediaType } from '$lib/interfaces/Media';
	import type {
		IAudioTimelineElementSettings,
		IImageTimelineElementSettings,
		IVideoTimelineElementSettings
	} from '$lib/interfaces/Timeline';
	import type { IPlayerElement, IPlayerElementsMap } from '$lib/interfaces/Player';
	import type { ITimelineTrack } from '$lib/interfaces/Timeline';
	import {
		getCurrentMediaTime,
		getFadeVolumeMultiplier,
		isPlaybackInElement
	} from '$lib/utils/playback.utils';
	import { isSameAspectRatio } from '$lib/utils/utils';
	import {
		getTimelineElementSpeed,
		normalizeTimelineElementSettings
	} from '$lib/utils/timeline-settings.utils';
	import {
		availableMedia,
		currentPlaybackTime,
		previewAspectRatio,
		previewPlaying,
		timelineTracks,
		windowHeight,
		windowWidth
	} from '../../../stores/store';

	let previewPlayerRef: HTMLDivElement;
	let fullWidth = true;
	let audioContext: AudioContext | undefined;

	$: timelineElements = flattenTimelineTracks($timelineTracks);

	// map to hold references to each player element and its properties using its elementId as a key
	let playerElementsMap: IPlayerElementsMap = {};
	$: filterPlayerElementsMap(playerElementsMap);

	// handle playing and pausing elements when the playback is being paused/played store value changes
	$: handlePlayingElements($previewPlaying);

	// handle playing and pausing elements when the currentPlaybackTime store value changes
	$: $currentPlaybackTime, handlePlaybackTimeUpdate();

	// handle preview player sizing when either window height or width change
	$: $windowWidth, $windowHeight, handleWindowWidthOrHeightChange();

	// check if preview player sizing needs to be updated on window size change
	function handleWindowWidthOrHeightChange() {
		if (!previewPlayerRef) {
			return;
		}

		// get the height and width from the preview player
		const previewBoundingRect = previewPlayerRef.getBoundingClientRect();
		const previewWidth = previewBoundingRect.width;
		const previewHeight = previewBoundingRect.height;

		// check if the current width and height of the player match the aspect ratio defined in the store
		const sameAspectRatio = isSameAspectRatio(previewWidth, previewHeight);

		// if the aspect ratio of the preview player doesn't match the on in the store
		if (!sameAspectRatio) {
			// if the height was cut off (width: 100%, height: auto) before, cut off width (width: auto, height: 100%) now and the other way around
			fullWidth = !fullWidth;
		}
	}

	// handles what elements need to be updated while playback is running
	function handlePlaybackTimeUpdate() {
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

			// type the el property to get correct typing
			const htmlEl = el.el as HTMLMediaElement;
			configureMediaElement(htmlEl, el.properties);

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
		if (playing && audioContext?.state === 'suspended') {
			audioContext.resume();
		}

		// everytime the playback is being started/paused, go through the whole map and check what elements
		// needs to be played or paused
		Object.values(playerElementsMap).forEach((el) => {
			// ignore image elements
			if (el.properties.type === MediaType.Image) {
				return;
			}

			// type the el property to get correct typing
			const htmlEl = el.el as HTMLMediaElement;
			configureMediaElement(htmlEl, el.properties);

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

	function configureMediaElement(htmlEl: HTMLMediaElement, element: IPlayerElement) {
		htmlEl.playbackRate = getTimelineElementSpeed(element);
		const gainNode = getMediaGainNode(htmlEl, element);
		const volume = getMediaVolume(element);

		if (gainNode) {
			// use Web Audio gain so preview volume can go above the native media cap of 100%
			htmlEl.volume = 1;
			gainNode.gain.value = volume;
		} else {
			htmlEl.volume = Math.max(0, Math.min(1, volume));
		}
	}

	function getMediaVolume(element: IPlayerElement): number {
		if (element.type === MediaType.Audio) {
			const settings = normalizeTimelineElementSettings(element) as IAudioTimelineElementSettings;
			return Math.max(0, settings.volume * getFadeVolumeMultiplier(element));
		}

		if (element.type === MediaType.Video) {
			const settings = normalizeTimelineElementSettings(element) as IVideoTimelineElementSettings;
			return Math.max(0, settings.volume);
		}

		return 1;
	}

	function getMediaGainNode(
		htmlEl: HTMLMediaElement,
		element: IPlayerElement
	): GainNode | undefined {
		const playerElement = playerElementsMap[element.elementId];

		if (!playerElement) {
			return undefined;
		}

		if (playerElement.audio) {
			return playerElement.audio.gainNode;
		}

		if (!audioContext) {
			audioContext = new AudioContext();
		}

		// each media element can only be connected to one source node, so keep the node on the map
		const sourceNode = audioContext.createMediaElementSource(htmlEl);
		const gainNode = audioContext.createGain();
		sourceNode.connect(gainNode).connect(audioContext.destination);
		playerElement.audio = { sourceNode, gainNode };

		return gainNode;
	}

	// filter the given map by removing keys where the "el" property in the value is null
	function filterPlayerElementsMap(map: IPlayerElementsMap) {
		// loop through map and filter out elements where the element is null
		for (const [key, value] of Object.entries(map)) {
			if (value.el === null) {
				delete playerElementsMap[key];
			}
		}
	}

	// create a flattened array of timeline elements from a given array of tracks
	function flattenTimelineTracks(arr: ITimelineTrack[]): IPlayerElement[] {
		// go through each track, return the flattened elements array and flatten the end result after all tracks have been iterated through so we end up with a flat array of all elements in all tracks
		const flatArr = arr.flatMap((track) =>
			track.elements.flatMap((el) => {
				// lookup media from availableMedia array in store using mediaId and get src property
				const foundEl = $availableMedia.find((media) => media.mediaId === el.mediaId);
				if (!foundEl) {
					return el;
				}
				const playerEl = { src: foundEl.src, ...el } as IPlayerElement;

				// if key with matching element id exists, add the media properties to the value
				playerElementsMap[playerEl.elementId] = {
					...playerElementsMap[playerEl.elementId],
					properties: playerEl
				};

				return playerEl;
			})
		);

		return flatArr.length > 0 ? flatArr : [];
	}

	// calculate if given element should be displayed or not by checking if the current playback time is within the element time on the timeline
	function displayMediaElement(time: number, el: IPlayerElement) {
		return time - el.playbackStartTime >= 0 && time - el.playbackStartTime <= el.duration
			? 'unset'
			: 'none';
	}

	function getVisualOpacity(element: IPlayerElement): number {
		if (element.type === MediaType.Audio) {
			return 1;
		}

		const settings = normalizeTimelineElementSettings(element) as
			| IVideoTimelineElementSettings
			| IImageTimelineElementSettings;
		return settings.opacity;
	}

	function getVisualTransform(element: IPlayerElement): string {
		if (element.type === MediaType.Audio) {
			return 'none';
		}

		const settings = normalizeTimelineElementSettings(element) as
			| IVideoTimelineElementSettings
			| IImageTimelineElementSettings;
		const x = settings.flipHorizontal ? -1 : 1;
		const y = settings.flipVertical ? -1 : 1;

		return `scale(${x}, ${y})`;
	}
</script>

<!-- set either height or width value to 100% to keep aspect ratio -->
<div
	class="relative bg-black preview-player max-h-full max-w-full"
	style="
		aspect-ratio: {$previewAspectRatio};
		{fullWidth ? 'width: 100%;' : 'height: 100%'}
	"
	bind:this={previewPlayerRef}
>
	<!-- for each element in the timeline show either a video, audio or image element -->
	{#each timelineElements as element, i (element.elementId)}
		{#if element.type === MediaType.Video}
			<!-- svelte-ignore a11y-media-has-caption -->
			<video
				data-id={element.elementId}
				data-duration={element.duration}
				preload="auto"
				class="absolute top-0 left-0 w-full h-full pointer-events-none object-contain"
				style="
					display: {displayMediaElement($currentPlaybackTime, element)}; 
					z-index:{timelineElements.length - i};
					opacity: {getVisualOpacity(element)};
					transform: {getVisualTransform(element)};
				"
				src={element.src}
				bind:this={playerElementsMap[element.elementId].el}
			>
			</video>
		{:else if element.type === MediaType.Audio}
			<audio
				data-id={element.elementId}
				data-duration={element.duration}
				preload="auto"
				class="absolute top-0 left-0 w-full h-full pointer-events-none"
				style="
					display: {displayMediaElement($currentPlaybackTime, element)}; 
					z-index:{timelineElements.length - i};
				"
				src={element.src}
				bind:this={playerElementsMap[element.elementId].el}
			></audio>
		{:else if element.type === MediaType.Image}
			<img
				src={element.src}
				alt=""
				bind:this={playerElementsMap[element.elementId].el}
				class="absolute top-0 left-0 w-full h-full pointer-events-none object-contain"
				style="
					display: {displayMediaElement($currentPlaybackTime, element)}; 
					z-index:{timelineElements.length - i};
					opacity: {getVisualOpacity(element)};
					transform: {getVisualTransform(element)};
				"
				data-id={element.elementId}
			/>
		{:else}
			<!-- default case that should not be reached usually -->
			<div class="no-matching-element-type"></div>
		{/if}
	{/each}
</div>
