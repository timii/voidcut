<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '../shared/Button.svelte';
	import IconButton from '../shared/IconButton.svelte';
	import AboutIcon from '$lib/assets/header/about.png';
	import CloseIcon from '$lib/assets/header/close.png';
	import SuccessIcon from '$lib/assets/header/complete.png';
	import ErrorIcon from '$lib/assets/header/error.png';
	import DownloadIcon from '$lib/assets/header/download.png';
	import CancelIcon from '$lib/assets/header/cancel.png';
	import ExportIcon from '$lib/assets/header/export.png';
	import {
		estimatedExportFileSize,
		exportOverlayOpen,
		exportSettings,
		exportState,
		ffmpegProgress,
		ffmpegProgressElapsedTime,
		maxPlaybackTime,
		outputFileName,
		previewAspectRatio,
		processedFileSize
	} from '../../../stores/store';
	import {
		ExportFormat,
		ExportResolution,
		ExportState,
		type IExportSettings
	} from '$lib/interfaces/Ffmpeg';
	import { callFfmpeg, downloadOutput, terminateFfmpegExecution } from '$lib/utils/ffmpeg.utils';
	import { formatTime } from '$lib/utils/time.utils';
	import {
		estimateExportFileSize,
		getExportResolution,
		sanitizeExportBaseName
	} from '$lib/utils/export.utils';

	export let open = false;

	const formatOptions = [ExportFormat.MP4, ExportFormat.GIF, ExportFormat.PNG, ExportFormat.MP3];
	const resolutionOptions = [
		ExportResolution.AUTO,
		ExportResolution.P480,
		ExportResolution.P720,
		ExportResolution.P1080
	];
	const dialogIcons = [
		AboutIcon,
		CloseIcon,
		SuccessIcon,
		ErrorIcon,
		DownloadIcon,
		CancelIcon,
		ExportIcon
	];

	let settings: IExportSettings = $exportSettings;

	$: estimatedSize = estimateExportFileSize(settings, $maxPlaybackTime, $previewAspectRatio);
	$: estimatedExportFileSize.set(estimatedSize);
	$: outputSize = getExportResolution(settings.resolution, $previewAspectRatio);

	onMount(() => {
		// preload state-specific icons so they do not pop in after export state changes
		dialogIcons.forEach((icon) => {
			const image = new Image();
			image.src = icon;
		});
	});

	function onClickBackdrop(e: Event) {
		e.stopPropagation();
	}

	function updateSettings(nextSettings: Partial<IExportSettings>) {
		settings = {
			...settings,
			...nextSettings
		};
		exportSettings.set(settings);
	}

	function onFormatClick(format: ExportFormat) {
		updateSettings({
			format,
			fileName: sanitizeExportBaseName(settings.fileName)
		});
	}

	function onResolutionClick(resolution: ExportResolution) {
		updateSettings({ resolution });
	}

	function onCompressionInput(e: Event) {
		updateSettings({ compression: +(e.target as HTMLInputElement).value });
	}

	function onFileNameInput(e: Event) {
		updateSettings({ fileName: (e.target as HTMLInputElement).value });
	}

	async function onExportClick(e: Event) {
		e.stopPropagation();
		const nextSettings = {
			...settings,
			fileName: sanitizeExportBaseName(settings.fileName)
		};
		settings = nextSettings;
		exportSettings.set(nextSettings);
		await callFfmpeg(nextSettings);
	}

	async function onCancelClick(e: Event) {
		e.stopPropagation();
		await terminateFfmpegExecution();
	}

	function onSaveClick(e: Event) {
		e.stopPropagation();
		downloadOutput();
	}

	function onCloseClick(e: Event) {
		e.stopPropagation();
		exportState.set(ExportState.NOT_STARTED);
		exportOverlayOpen.set(false);
	}

	function onBackToSettingsClick(e: Event) {
		e.stopPropagation();
		exportState.set(ExportState.NOT_STARTED);
	}

	function getResolutionLabel(resolution: ExportResolution): string {
		return resolution === ExportResolution.AUTO ? 'Auto' : resolution;
	}
</script>

{#if open}
	<div
		class="absolute top-0 left-0 z-10 w-full h-full bg-opacity-80 bg-backdrop-color export-dialog-bg"
		on:click={onClickBackdrop}
		aria-hidden="true"
	>
		<div
			class="fixed -translate-x-1/2 -translate-y-1/2 export-dialog bg-background-highlight text-text-highlight top-1/2 left-1/2 min-h-[400px] w-[700px] rounded-2xl p-8 gap-5 flex flex-col"
		>
			{#if $exportState === ExportState.NOT_STARTED}
				<div class="absolute right-8 top-6">
					<IconButton onClickCallback={onCloseClick} icon={CloseIcon}></IconButton>
				</div>

				<div class="text-2xl">Export</div>

				<div class="flex flex-col gap-2">
					<div class="text-sm text-text-highlight">Format</div>
					<div class="grid grid-cols-4 gap-2">
						{#each formatOptions as format}
							<button
								type="button"
								class:bg-accent-color={settings.format === format}
								class:bg-background-progress={settings.format !== format}
								class="rounded px-4 py-3 text-sm uppercase text-text-highlight hover:opacity-90"
								on:click={() => onFormatClick(format)}
							>
								{format}
							</button>
						{/each}
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<div class="text-sm text-text-highlight">Resolution</div>
						<div class="text-xs text-text-info">{outputSize}px</div>
					</div>
					<div class="grid grid-cols-4 gap-2">
						{#each resolutionOptions as resolution}
							<button
								type="button"
								class:bg-accent-color={settings.resolution === resolution}
								class:bg-background-progress={settings.resolution !== resolution}
								class="rounded px-4 py-3 text-sm text-text-highlight hover:opacity-90"
								on:click={() => onResolutionClick(resolution)}
							>
								{getResolutionLabel(resolution)}
							</button>
						{/each}
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<div>
						<div class="flex items-center gap-2 text-sm text-text-highlight">
							<span>Compression</span>
							<span class="group relative inline-flex">
								<IconButton
									icon={AboutIcon}
									alt="Compression info"
									size={16}
									onClickCallback={(e) => e.preventDefault()}
								></IconButton>
								<!-- keep this tooltip local so it stays visually attached to the modal -->
								<span
									class="pointer-events-none invisible absolute bottom-[calc(100%+6px)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-background-tooltip px-3 py-1 text-xxs font-semibold leading-4 text-text-tooltip opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
								>
									Adjust file size without changing resolution
								</span>
							</span>
						</div>
					</div>
					<input
						type="range"
						min="0"
						max="100"
						value={settings.compression}
						on:input={onCompressionInput}
						class="h-1 cursor-pointer accent-accent-color"
					/>
					<div class="flex justify-between text-xs text-text-info">
						<span>Smaller file</span>
						<span>Higher quality</span>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm text-text-highlight" for="export-file-name">Filename</label>
					<div class="flex items-center gap-2">
						<input
							id="export-file-name"
							type="text"
							value={settings.fileName}
							on:input={onFileNameInput}
							class="w-full rounded bg-background-progress px-3 py-2 text-sm text-text-highlight outline-none focus:outline focus:outline-1 focus:outline-accent-color"
						/>
						<div class="min-w-[64px] text-sm text-text-info">.{settings.format}</div>
					</div>
				</div>

				<div class="flex items-center justify-between border-t border-background-icon-button pt-4">
					<div class="text-sm text-text-info">
						Estimated file size: <span class="text-text-highlight">{$estimatedExportFileSize}</span>
					</div>
					<Button text={'Export'} onClickCallback={onExportClick} icon={ExportIcon}></Button>
				</div>
			{:else if $exportState === ExportState.PROCESSING}
				<div class="flex h-[336px] flex-col items-center justify-center gap-3">
					<div class="text-3xl">Exporting...</div>
					<div class="mb-10 text-lg text-l">Your file is being processed, please wait</div>
					<div class="flex items-center gap-4">
						<div
							class="progress-bar h-4 w-[450px] bg-background-progress rounded-sm relative block"
						>
							<span
								style="width: {$ffmpegProgress}%;"
								class="block h-full rounded-sm bg-accent-color"
							></span>
						</div>
						<div class="color-accent-color">{$ffmpegProgress}%</div>
					</div>
					<div>Elapsed time: {formatTime($ffmpegProgressElapsedTime)}</div>
					<div class="mt-10">
						<Button text={'Cancel'} onClickCallback={onCancelClick} icon={CancelIcon}></Button>
					</div>
				</div>
			{:else if $exportState === ExportState.COMPLETE}
				<div class="absolute right-8 top-6">
					<IconButton onClickCallback={onCloseClick} icon={CloseIcon}></IconButton>
				</div>
				<div class="flex h-[336px] flex-col items-center justify-center gap-3">
					<img class="mb-4 h-12 w-12" src={SuccessIcon} alt="complete" />
					<div class="text-xl">Exporting complete</div>
					<div class="text-sm text-center text-text-info">
						<div>File size: {$processedFileSize} MB</div>
						<div>Elapsed time: {formatTime($ffmpegProgressElapsedTime)}</div>
						<div>Output file: {$outputFileName}</div>
					</div>
					<div class="mt-6">
						<Button onClickCallback={onSaveClick} text={'Download'} icon={DownloadIcon}></Button>
					</div>
				</div>
			{:else}
				<div class="absolute right-8 top-6">
					<IconButton onClickCallback={onCloseClick} icon={CloseIcon}></IconButton>
				</div>
				<div class="flex h-[336px] flex-col items-center justify-center gap-3">
					<img class="mb-4 h-12 w-12" src={ErrorIcon} alt="error" />
					<div class="text-xl">There was an error during processing!</div>
					<Button text={'Back to settings'} onClickCallback={onBackToSettingsClick}></Button>
				</div>
			{/if}
		</div>
	</div>
{/if}
