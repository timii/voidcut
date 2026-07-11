<script lang="ts">
	import { MediaType } from '$lib/interfaces/Media';
	import type {
		IAudioTimelineElementSettings,
		IImageTimelineElementSettings,
		ITimelineElement,
		ITimelineTrack,
		IVideoTimelineElementSettings,
		TimelineElementSpeed
	} from '$lib/interfaces/Timeline';
	import { selectedElement, timelineTracks } from '../../../stores/store';
	import {
		DEFAULT_IMAGE_DURATION_MS,
		IMAGE_DURATION_PRESETS_MS,
		MAX_OPACITY,
		MAX_VOLUME,
		TIMELINE_SPEED_PRESETS,
		clampFade,
		clampNumber,
		elementCanUseDuration,
		getDefaultTimelineElementSettings,
		getTimelineDurationForSpeed,
		normalizeTimelineElementSettings
	} from '$lib/utils/timeline-settings.utils';
	import { formatTime } from '$lib/utils/time.utils';

	let warning = '';
	let lastSelectedElementId = '';

	$: selectedData = getSelectedElementData($timelineTracks, $selectedElement.elementId);
	$: if (lastSelectedElementId !== $selectedElement.elementId) {
		warning = '';
		lastSelectedElementId = $selectedElement.elementId;
	}

	function getSelectedElementData(tracks: ITimelineTrack[], elementId: string) {
		if (!elementId) {
			return undefined;
		}

		for (let rowIndex = 0; rowIndex < tracks.length; rowIndex++) {
			const elementIndex = tracks[rowIndex].elements.findIndex((el) => el.elementId === elementId);

			if (elementIndex > -1) {
				return { rowIndex, elementIndex, element: tracks[rowIndex].elements[elementIndex] };
			}
		}

		return undefined;
	}

	function deselectElement() {
		selectedElement.set({ elementId: '', mediaType: undefined });
	}

	function formatMediaType(type: MediaType): string {
		const lowercaseType = type.toLowerCase();
		return lowercaseType.charAt(0).toUpperCase() + lowercaseType.slice(1);
	}

	function numberFromEvent(e: Event): number {
		return +(e.currentTarget as HTMLInputElement).value;
	}

	function updateSelectedElement(
		createElement: (
			element: ITimelineElement,
			tracks: ITimelineTrack[],
			rowIndex: number,
			elementIndex: number
		) => ITimelineElement | undefined
	) {
		if (!selectedData) {
			return;
		}

		timelineTracks.update((tracks) => {
			const nextElement = createElement(
				tracks[selectedData!.rowIndex].elements[selectedData!.elementIndex],
				tracks,
				selectedData!.rowIndex,
				selectedData!.elementIndex
			);

			if (!nextElement) {
				return tracks;
			}

			return tracks.map((track, rowIndex) => {
				if (rowIndex !== selectedData!.rowIndex) {
					return track;
				}

				return {
					...track,
					elements: track.elements.map((element, elementIndex) =>
						elementIndex === selectedData!.elementIndex ? nextElement : element
					)
				};
			});
		});
	}

	function updateAudioSetting(
		createSettings: (
			settings: IAudioTimelineElementSettings,
			element: ITimelineElement
		) => IAudioTimelineElementSettings
	) {
		updateSelectedElement((element) => {
			const settings = normalizeTimelineElementSettings(element) as IAudioTimelineElementSettings;
			const nextSettings = createSettings(settings, element);
			warning = '';
			return { ...element, settings: nextSettings };
		});
	}

	function updateVideoSetting(
		createSettings: (
			settings: IVideoTimelineElementSettings,
			element: ITimelineElement
		) => IVideoTimelineElementSettings
	) {
		updateSelectedElement((element) => {
			const settings = normalizeTimelineElementSettings(element) as IVideoTimelineElementSettings;
			const nextSettings = createSettings(settings, element);
			warning = '';
			return { ...element, settings: nextSettings };
		});
	}

	function updateImageSetting(
		createSettings: (
			settings: IImageTimelineElementSettings,
			element: ITimelineElement
		) => IImageTimelineElementSettings
	) {
		updateSelectedElement((element) => {
			const settings = normalizeTimelineElementSettings(element) as IImageTimelineElementSettings;
			const nextSettings = createSettings(settings, element);
			warning = '';
			return { ...element, settings: nextSettings };
		});
	}

	function updateSpeed(speed: TimelineElementSpeed) {
		updateSelectedElement((element, tracks, rowIndex, elementIndex) => {
			if (element.type === MediaType.Image) {
				return element;
			}

			const nextDuration = getTimelineDurationForSpeed(element, speed);
			if (!elementCanUseDuration(tracks, rowIndex, elementIndex, nextDuration)) {
				warning = 'Not enough space to change speed.';
				return undefined;
			}

			// changing speed changes the visible timeline duration, so fades must stay within it
			const settings = normalizeTimelineElementSettings(element) as
				| IAudioTimelineElementSettings
				| IVideoTimelineElementSettings;
			warning = '';
			return {
				...element,
				duration: nextDuration,
				settings: {
					...settings,
					speed,
					...(element.type === MediaType.Audio
						? {
								fadeInMs: clampFade(
									(settings as IAudioTimelineElementSettings).fadeInMs,
									nextDuration
								),
								fadeOutMs: clampFade(
									(settings as IAudioTimelineElementSettings).fadeOutMs,
									nextDuration
								)
						  }
						: {})
				}
			};
		});
	}

	function updateImageDuration(duration: number) {
		updateSelectedElement((element, tracks, rowIndex, elementIndex) => {
			// settings edits should not silently push neighboring timeline elements
			if (!elementCanUseDuration(tracks, rowIndex, elementIndex, duration)) {
				warning = 'Not enough space to change duration.';
				return undefined;
			}

			warning = '';
			return { ...element, duration };
		});
	}

	function resetSettings() {
		updateSelectedElement((element, tracks, rowIndex, elementIndex) => {
			const defaultSettings = getDefaultTimelineElementSettings(element.type);
			const nextDuration =
				element.type === MediaType.Image
					? DEFAULT_IMAGE_DURATION_MS
					: getTimelineDurationForSpeed(element, 1);

			// resetting speed or image duration can grow the element, so keep the same overlap guard
			if (!elementCanUseDuration(tracks, rowIndex, elementIndex, nextDuration)) {
				warning = 'Not enough space to reset settings.';
				return undefined;
			}

			warning = '';
			return {
				...element,
				duration: nextDuration,
				settings: defaultSettings
			};
		});
	}

	function durationPresetDisabled(duration: number): boolean {
		if (!selectedData) {
			return true;
		}

		return !elementCanUseDuration(
			$timelineTracks,
			selectedData.rowIndex,
			selectedData.elementIndex,
			duration
		);
	}

	function getAudioSettings(element: ITimelineElement): IAudioTimelineElementSettings {
		return element.settings as IAudioTimelineElementSettings;
	}

	function getVideoSettings(element: ITimelineElement): IVideoTimelineElementSettings {
		return element.settings as IVideoTimelineElementSettings;
	}

	function getImageSettings(element: ITimelineElement): IImageTimelineElementSettings {
		return element.settings as IImageTimelineElementSettings;
	}
</script>

<div class="h-full bg-background-highlight rounded-r-xl p-4 overflow-y-auto">
	{#if selectedData}
		<div class="flex flex-col gap-4 text-text-color text-sm">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<div class="font-semibold truncate">{selectedData.element.mediaName}</div>
					<div class="text-text-info text-xs mt-1">
						{formatMediaType(selectedData.element.type)} - {formatTime(
							selectedData.element.duration
						)}
					</div>
				</div>
				<div class="flex gap-2">
					<button class="action-button" on:click={resetSettings}>Reset</button>
					<button class="action-button" on:click={deselectElement}>Close</button>
				</div>
			</div>

			{#if warning}
				<div class="text-xs text-accent-color border border-accent-color rounded p-2">
					{warning}
				</div>
			{/if}

			{#if selectedData.element.type === MediaType.Audio}
				{@const settings = getAudioSettings(selectedData.element)}
				<div class="setting-row">
					<label for="audio-volume">Volume</label>
					<span>{Math.round(settings.volume * 100)}%</span>
					<input
						id="audio-volume"
						type="range"
						min="0"
						max={MAX_VOLUME * 100}
						step="5"
						value={settings.volume * 100}
						on:input={(e) =>
							updateAudioSetting((prev) => ({
								...prev,
								volume: clampNumber(numberFromEvent(e) / 100, 0, MAX_VOLUME, 1)
							}))}
					/>
				</div>

				<div class="setting-row">
					<label for="audio-fade-in">Fade In</label>
					<span>{formatTime(settings.fadeInMs)}</span>
					<input
						id="audio-fade-in"
						type="range"
						min="0"
						max={selectedData.element.duration}
						step="100"
						value={settings.fadeInMs}
						on:input={(e) =>
							updateAudioSetting((prev, element) => ({
								...prev,
								fadeInMs: clampFade(numberFromEvent(e), element.duration)
							}))}
					/>
				</div>

				<div class="setting-row">
					<label for="audio-fade-out">Fade Out</label>
					<span>{formatTime(settings.fadeOutMs)}</span>
					<input
						id="audio-fade-out"
						type="range"
						min="0"
						max={selectedData.element.duration}
						step="100"
						value={settings.fadeOutMs}
						on:input={(e) =>
							updateAudioSetting((prev, element) => ({
								...prev,
								fadeOutMs: clampFade(numberFromEvent(e), element.duration)
							}))}
					/>
				</div>

				<div class="setting-group">
					<div class="setting-label">Speed</div>
					<div class="button-grid">
						{#each TIMELINE_SPEED_PRESETS as speed}
							<button
								class:active-button={settings.speed === speed}
								class="preset-button"
								on:click={() => updateSpeed(speed)}
							>
								{speed}x
							</button>
						{/each}
					</div>
				</div>
			{:else if selectedData.element.type === MediaType.Video}
				{@const settings = getVideoSettings(selectedData.element)}
				<div class="setting-group">
					<div class="setting-label">Flip</div>
					<div class="grid grid-cols-2 gap-2">
						<button
							class:active-button={settings.flipHorizontal}
							class="preset-button"
							on:click={() =>
								updateVideoSetting((prev) => ({
									...prev,
									flipHorizontal: !prev.flipHorizontal
								}))}
						>
							Horizontal
						</button>
						<button
							class:active-button={settings.flipVertical}
							class="preset-button"
							on:click={() =>
								updateVideoSetting((prev) => ({
									...prev,
									flipVertical: !prev.flipVertical
								}))}
						>
							Vertical
						</button>
					</div>
				</div>

				<div class="setting-row">
					<label for="video-volume">Volume</label>
					<span>{Math.round(settings.volume * 100)}%</span>
					<input
						id="video-volume"
						type="range"
						min="0"
						max={MAX_VOLUME * 100}
						step="5"
						value={settings.volume * 100}
						on:input={(e) =>
							updateVideoSetting((prev) => ({
								...prev,
								volume: clampNumber(numberFromEvent(e) / 100, 0, MAX_VOLUME, 1)
							}))}
					/>
				</div>

				<div class="setting-group">
					<div class="setting-label">Speed</div>
					<div class="button-grid">
						{#each TIMELINE_SPEED_PRESETS as speed}
							<button
								class:active-button={settings.speed === speed}
								class="preset-button"
								on:click={() => updateSpeed(speed)}
							>
								{speed}x
							</button>
						{/each}
					</div>
				</div>

				<div class="setting-row">
					<label for="video-opacity">Opacity</label>
					<span>{Math.round(settings.opacity * 100)}%</span>
					<input
						id="video-opacity"
						type="range"
						min="0"
						max={MAX_OPACITY * 100}
						step="5"
						value={settings.opacity * 100}
						on:input={(e) =>
							updateVideoSetting((prev) => ({
								...prev,
								opacity: clampNumber(numberFromEvent(e) / 100, 0, MAX_OPACITY, 1)
							}))}
					/>
				</div>
			{:else if selectedData.element.type === MediaType.Image}
				{@const settings = getImageSettings(selectedData.element)}
				<div class="setting-group">
					<div class="setting-label">Flip</div>
					<div class="grid grid-cols-2 gap-2">
						<button
							class:active-button={settings.flipHorizontal}
							class="preset-button"
							on:click={() =>
								updateImageSetting((prev) => ({
									...prev,
									flipHorizontal: !prev.flipHorizontal
								}))}
						>
							Horizontal
						</button>
						<button
							class:active-button={settings.flipVertical}
							class="preset-button"
							on:click={() =>
								updateImageSetting((prev) => ({
									...prev,
									flipVertical: !prev.flipVertical
								}))}
						>
							Vertical
						</button>
					</div>
				</div>

				<div class="setting-row">
					<label for="image-opacity">Opacity</label>
					<span>{Math.round(settings.opacity * 100)}%</span>
					<input
						id="image-opacity"
						type="range"
						min="0"
						max={MAX_OPACITY * 100}
						step="5"
						value={settings.opacity * 100}
						on:input={(e) =>
							updateImageSetting((prev) => ({
								...prev,
								opacity: clampNumber(numberFromEvent(e) / 100, 0, MAX_OPACITY, 1)
							}))}
					/>
				</div>

				<div class="setting-group">
					<div class="setting-label">Duration</div>
					<div class="button-grid">
						{#each IMAGE_DURATION_PRESETS_MS as duration}
							<button
								class:active-button={selectedData.element.duration === duration}
								class="preset-button"
								disabled={durationPresetDisabled(duration)}
								on:click={() => updateImageDuration(duration)}
							>
								{formatTime(duration)}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="postcss">
	.setting-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;
		align-items: center;
	}

	.setting-row label,
	.setting-label {
		font-weight: 600;
	}

	.setting-row span {
		color: theme(colors.text-info);
		font-size: 12px;
	}

	.setting-row input {
		grid-column: 1 / -1;
		width: 100%;
		accent-color: theme(colors.accent-color);
	}

	.setting-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.button-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}

	.preset-button {
		border: 1px solid theme(colors.background-icon-button);
		border-radius: 6px;
		padding: 6px 8px;
		font-size: 12px;
		background: transparent;
		color: theme(colors.text-color);
	}

	.action-button {
		border: 1px solid theme(colors.background-icon-button);
		border-radius: 6px;
		padding: 4px 8px;
		font-size: 12px;
		background: transparent;
		color: theme(colors.text-color);
	}

	.preset-button:hover:not(:disabled),
	.action-button:hover {
		background: theme(colors.background-icon-button);
		color: theme(colors.text-highlight);
	}

	.active-button {
		background: theme(colors.background-stripe1);
		border-color: theme(colors.accent-color);
		color: theme(colors.text-highlight);
	}

	.preset-button:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}
</style>
