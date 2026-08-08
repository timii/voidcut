<script lang="ts">
	import { afterUpdate, onDestroy } from 'svelte';
	import { MediaType, type IMedia } from '$lib/interfaces/Media';
	import type {
		IAudioTimelineElementSettings,
		IImageTimelineElementSettings,
		ITimelineTrack,
		IVideoTimelineElementSettings
	} from '$lib/interfaces/Timeline';
	import type {
		IPlayerElement,
		IPlayerElementAudio,
		IPlayerElementsMap
	} from '$lib/interfaces/Player';
	import {
		getMediaSyncActions,
		hasPlaybackTimeJumped,
		shouldCheckMediaDrift,
		shouldRunMediaSync
	} from '$lib/utils/media-sync.utils';
	import { getCurrentMediaTime, getFadeVolumeMultiplier } from '$lib/utils/playback.utils';
	import {
		getManagedPreviewElements,
		getManagedPreviewSignature,
		type IManagedPreviewElement
	} from '$lib/utils/preview.utils';
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
	let playerElementsMap: IPlayerElementsMap = {};
	let managedElements: IManagedPreviewElement[] = [];
	let renderedManagedSignature = '';
	let previousTimelineTracks: ITimelineTrack[] | undefined;
	let previousAvailableMedia: IMedia[] | undefined;
	let lastManagedSignature = '';
	let lastObservedTime = 0;
	let observedPlaybackTime = false;
	let lastDriftCheckAt = 0;
	let lastSyncAt = 0;
	let previousPlaying = false;

	$: updateManagedPreviewElements($timelineTracks, $availableMedia, $currentPlaybackTime);
	$: registerManagedElements(managedElements);
	$: $windowWidth, $windowHeight, handleWindowWidthOrHeightChange();

	afterUpdate(() => {
		syncPreviewIfNeeded(managedElements, $currentPlaybackTime, $previewPlaying);
		removeDetachedEntries(managedElements);
	});

	onDestroy(() => {
		Object.values(playerElementsMap).forEach(cleanupPlayerElement);
		if (audioContext) {
			audioContext.close().catch(() => undefined);
		}
	});

	function handleWindowWidthOrHeightChange() {
		if (!previewPlayerRef) {
			return;
		}

		const previewBoundingRect = previewPlayerRef.getBoundingClientRect();
		if (!isSameAspectRatio(previewBoundingRect.width, previewBoundingRect.height)) {
			fullWidth = !fullWidth;
		}
	}

	function updateManagedPreviewElements(tracks: ITimelineTrack[], media: IMedia[], timeMs: number) {
		const nextElements = getManagedPreviewElements(tracks, media, timeMs);
		const nextSignature = getManagedPreviewSignature(nextElements);
		const sourceDataChanged = tracks !== previousTimelineTracks || media !== previousAvailableMedia;

		// stable layer arrays prevent unchanged media DOM from being invalidated on every clock tick
		if (sourceDataChanged || nextSignature !== renderedManagedSignature) {
			managedElements = nextElements;
			renderedManagedSignature = nextSignature;
		}

		previousTimelineTracks = tracks;
		previousAvailableMedia = media;
	}

	function registerManagedElements(elements: IManagedPreviewElement[]) {
		const managedIds = new Set(elements.map((element) => element.elementId));

		elements.forEach((element) => {
			const existing = playerElementsMap[element.elementId];
			if (existing) {
				existing.properties = element;
				return;
			}

			playerElementsMap[element.elementId] = {
				el: null,
				properties: element
			};
		});

		Object.entries(playerElementsMap).forEach(([elementId, playerElement]) => {
			if (!managedIds.has(elementId)) {
				cleanupPlayerElement(playerElement);
			}
		});
	}

	function removeDetachedEntries(elements: IManagedPreviewElement[]) {
		const managedIds = new Set(elements.map((element) => element.elementId));

		Object.entries(playerElementsMap).forEach(([elementId, playerElement]) => {
			if (!managedIds.has(elementId) && !playerElement.el) {
				delete playerElementsMap[elementId];
			}
		});
	}

	function syncManagedElements(
		elements: IManagedPreviewElement[],
		timeMs: number,
		playing: boolean,
		forceSeek: boolean,
		checkDrift: boolean,
		now: number
	) {
		if (playing && audioContext?.state === 'suspended') {
			audioContext.resume().catch(() => undefined);
		}

		elements.forEach((element) => {
			if (element.type === MediaType.Image) {
				return;
			}

			const playerElement = playerElementsMap[element.elementId];
			const htmlEl = playerElement?.el as HTMLMediaElement | null;
			if (!htmlEl || playerElement.loadFailed) {
				return;
			}

			const playbackRate = getTimelineElementSpeed(element);
			if (htmlEl.playbackRate !== playbackRate) {
				htmlEl.playbackRate = playbackRate;
			}

			const targetTime = getCurrentMediaTime(element, timeMs);
			const drift = checkDrift ? Math.abs(htmlEl.currentTime - targetTime) : 0;
			const actions = getMediaSyncActions({
				active: element.active,
				playing,
				paused: htmlEl.paused,
				seeking: htmlEl.seeking,
				playPending: playerElement.playPending ?? false,
				driftSeconds: drift,
				checkDrift,
				forceSeek,
				timeSinceCorrectionMs:
					playerElement.lastCorrectionAt === undefined
						? Number.POSITIVE_INFINITY
						: now - playerElement.lastCorrectionAt
			});

			if (actions.pause) {
				htmlEl.pause();
			}

			if (!element.active) {
				return;
			}

			if (element.type === MediaType.Audio || !playing || forceSeek) {
				configureMediaVolume(htmlEl, element, timeMs);
			}

			if (actions.seek && setMediaTime(htmlEl, targetTime)) {
				playerElement.lastCorrectionAt = now;
			}

			if (actions.play) {
				playerElement.playPending = true;
				const clearPendingPlay = () => {
					playerElement.playPending = false;
				};
				htmlEl.play().then(clearPendingPlay, clearPendingPlay);
			}
		});
	}

	function syncPreviewIfNeeded(
		elements: IManagedPreviewElement[],
		timeMs: number,
		playing: boolean
	) {
		const now = performance.now();
		const managedSignature = elements
			.map((element) => `${element.elementId}:${element.active}`)
			.join('|');
		const playbackChanged = playing !== previousPlaying;
		const managedSetChanged = managedSignature !== lastManagedSignature;
		// scheduler delays are not timeline seeks and must not reset every active decoder
		const timeJumped = hasPlaybackTimeJumped({
			previousTimeMs: lastObservedTime,
			currentTimeMs: timeMs,
			observedBefore: observedPlaybackTime
		});
		const forceSync = playbackChanged || managedSetChanged || timeJumped;
		const checkDrift = shouldCheckMediaDrift({
			force: forceSync,
			elapsedMs: now - lastDriftCheckAt
		});

		if (
			shouldRunMediaSync({
				playing,
				playbackChanged,
				managedSetChanged,
				timeJumped,
				elapsedMs: now - lastSyncAt
			})
		) {
			// normal playback sync is rate-limited so native decoding can advance uninterrupted
			syncManagedElements(elements, timeMs, playing, forceSync, checkDrift, now);
			lastSyncAt = now;
			if (checkDrift) {
				lastDriftCheckAt = now;
			}
		}

		lastManagedSignature = managedSignature;
		lastObservedTime = timeMs;
		observedPlaybackTime = true;
		previousPlaying = playing;
	}

	function handleLoadedMetadata(element: IManagedPreviewElement) {
		const htmlEl = playerElementsMap[element.elementId]?.el as HTMLMediaElement | null;
		if (!htmlEl) {
			return;
		}

		// upcoming media starts decoding near its trim point before the cut becomes active
		const targetTime = element.active
			? getCurrentMediaTime(element, $currentPlaybackTime)
			: element.trimFromStart / 1000;
		setMediaTime(htmlEl, targetTime);
	}

	function handleMediaError(elementId: string) {
		const playerElement = playerElementsMap[elementId];
		if (!playerElement) {
			return;
		}

		playerElement.loadFailed = true;
		if (playerElement.el instanceof HTMLMediaElement) {
			playerElement.el.pause();
		}
	}

	function setMediaTime(htmlEl: HTMLMediaElement, targetTime: number): boolean {
		if (htmlEl.readyState < HTMLMediaElement.HAVE_METADATA || !Number.isFinite(targetTime)) {
			return false;
		}

		const duration = Number.isFinite(htmlEl.duration) ? htmlEl.duration : targetTime;
		const clampedTime = Math.max(0, Math.min(duration, targetTime));
		if (Math.abs(htmlEl.currentTime - clampedTime) > 0.001) {
			htmlEl.currentTime = clampedTime;
			return true;
		}

		return false;
	}

	function configureMediaVolume(htmlEl: HTMLMediaElement, element: IPlayerElement, timeMs: number) {
		const gainNode = getMediaGainNode(htmlEl, element);
		const volume = getMediaVolume(element, timeMs);

		if (gainNode) {
			if (htmlEl.volume !== 1) {
				htmlEl.volume = 1;
			}
			if (Math.abs(gainNode.gain.value - volume) > 0.001) {
				gainNode.gain.value = volume;
			}
			return;
		}

		const nativeVolume = Math.max(0, Math.min(1, volume));
		if (Math.abs(htmlEl.volume - nativeVolume) > 0.001) {
			htmlEl.volume = nativeVolume;
		}
	}

	function getMediaVolume(element: IPlayerElement, timeMs: number): number {
		if (element.type === MediaType.Audio) {
			const settings = normalizeTimelineElementSettings(element) as IAudioTimelineElementSettings;
			return Math.max(0, settings.volume * getFadeVolumeMultiplier(element, timeMs));
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

		const sourceNode = audioContext.createMediaElementSource(htmlEl);
		const gainNode = audioContext.createGain();
		sourceNode.connect(gainNode).connect(audioContext.destination);
		playerElement.audio = { sourceNode, gainNode };

		return gainNode;
	}

	function cleanupPlayerElement(playerElement: {
		audio?: IPlayerElementAudio;
		el: HTMLElement | null;
		lastCorrectionAt?: number;
		playPending?: boolean;
	}) {
		if (playerElement.el instanceof HTMLMediaElement) {
			playerElement.el.pause();
		}

		if (playerElement.audio) {
			// detached media must release its audio graph before the bounded entry is removed
			playerElement.audio.sourceNode.disconnect();
			playerElement.audio.gainNode.disconnect();
			playerElement.audio = undefined;
		}

		playerElement.lastCorrectionAt = undefined;
		playerElement.playPending = false;
	}

	function getVisualOpacity(element: IManagedPreviewElement): number {
		if (element.type === MediaType.Audio) {
			return 1;
		}

		const settings = normalizeTimelineElementSettings(element) as
			| IVideoTimelineElementSettings
			| IImageTimelineElementSettings;
		return settings.opacity;
	}

	function getVisualTransform(element: IManagedPreviewElement): string {
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

<div
	class="relative bg-black preview-player max-h-full max-w-full"
	style="
		aspect-ratio: {$previewAspectRatio};
		{fullWidth ? 'width: 100%;' : 'height: 100%'}
	"
	bind:this={previewPlayerRef}
>
	{#each managedElements as element (element.elementId)}
		{#if element.type === MediaType.Video}
			<!-- svelte-ignore a11y-media-has-caption -->
			<video
				data-id={element.elementId}
				data-duration={element.duration}
				preload={element.active ? 'auto' : 'metadata'}
				class="absolute top-0 left-0 w-full h-full pointer-events-none object-contain"
				style="
					display: {element.active ? 'unset' : 'none'};
					z-index: {element.layerIndex};
					opacity: {getVisualOpacity(element)};
					transform: {getVisualTransform(element)};
				"
				src={element.src}
				bind:this={playerElementsMap[element.elementId].el}
				on:loadedmetadata={() => handleLoadedMetadata(element)}
				on:error={() => handleMediaError(element.elementId)}
			></video>
		{:else if element.type === MediaType.Audio}
			<audio
				data-id={element.elementId}
				data-duration={element.duration}
				preload={element.active ? 'auto' : 'metadata'}
				class="absolute top-0 left-0 w-full h-full pointer-events-none"
				style="display: none; z-index: {element.layerIndex}"
				src={element.src}
				bind:this={playerElementsMap[element.elementId].el}
				on:loadedmetadata={() => handleLoadedMetadata(element)}
				on:error={() => handleMediaError(element.elementId)}
			></audio>
		{:else if element.type === MediaType.Image}
			<img
				src={element.src}
				alt=""
				bind:this={playerElementsMap[element.elementId].el}
				class="absolute top-0 left-0 w-full h-full pointer-events-none object-contain"
				style="
					display: {element.active ? 'unset' : 'none'};
					z-index: {element.layerIndex};
					opacity: {getVisualOpacity(element)};
					transform: {getVisualTransform(element)};
				"
				data-id={element.elementId}
			/>
		{/if}
	{/each}
</div>
