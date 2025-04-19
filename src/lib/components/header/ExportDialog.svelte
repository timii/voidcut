<script lang="ts">
	import Button from '../shared/Button.svelte';
	import IconButton from '../shared/IconButton.svelte';
	import CloseIcon from '$lib/assets/header/close.png';
	import SuccessIcon from '$lib/assets/header/complete.png';
	import ErrorIcon from '$lib/assets/header/error.png';
	import DownloadIcon from '$lib/assets/header/download.png';
	import CancelIcon from '$lib/assets/header/cancel.png';
	import {
		exportOverlayOpen,
		exportState,
		ffmpegProgress,
		ffmpegProgressElapsedTime,
		outputFileName,
		processedFileSize
	} from '../../../stores/store';
	import { ExportState } from '$lib/interfaces/Ffmpeg';
	import { downloadOutput, terminateFfmpegExecution } from '$lib/utils/ffmpeg.utils';
	import { formatTime } from '$lib/utils/time.utils';

	export let open = false;

	function onClickBackdrop(e: Event) {
		e.stopPropagation();
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
		exportOverlayOpen.set(false);
	}
</script>

{#if open}
	<div
		class="absolute top-0 left-0 z-10 w-full h-full bg-opacity-80 bg-backdrop-color export-dialog-bg"
		on:click={onClickBackdrop}
		aria-hidden="true"
	>
		<div
			class="fixed -translate-x-1/2 -translate-y-1/2 export-dialog bg-background-highlight text-text-highlight top-1/2 left-1/2 h-[400px] w-[700px] rounded-2xl p-8 gap-3 flex flex-col items-center justify-center"
		>
			<!-- during processing -->
			{#if $exportState === ExportState.PROCESSING}
				<div class="text-3xl">Exporting...</div>
				<div class="mb-10 text-lg text-l">Your video is being processed, please wait</div>
				<div class="flex items-center gap-4">
					<div class="progress-bar h-4 w-[450px] bg-background-progress rounded-sm relative block">
						<span style="width: {$ffmpegProgress}%;" class="block h-full rounded-sm bg-accent-color"
						></span>
					</div>
					<div class="color-accent-color">{$ffmpegProgress}%</div>
				</div>
				<div>Elapsed time: {formatTime($ffmpegProgressElapsedTime)}</div>
				<div class="mt-10">
					<Button text={'Cancel'} onClickCallback={onCancelClick} icon={CancelIcon}></Button>
				</div>

				<!-- after processing complete -->
			{:else if $exportState === ExportState.COMPLETE}
				<div class="absolute right-8 top-6">
					<IconButton onClickCallback={onCloseClick} icon={CloseIcon}></IconButton>
				</div>
				<img class="mb-4" src={SuccessIcon} alt="complete" />
				<div class="text-xl">Exporting complete</div>
				<div class="text-sm text-center text-text-info">
					<div>File size: {$processedFileSize} MB</div>
					<div>Elapsed time: {formatTime($ffmpegProgressElapsedTime)}</div>
					<div>Output file: {$outputFileName}</div>
				</div>
				<div class="mt-6">
					<Button onClickCallback={onSaveClick} text={'Download'} icon={DownloadIcon}></Button>
				</div>

				<!-- if an error occured -->
			{:else}
				<div class="absolute right-8 top-6">
					<IconButton onClickCallback={onCloseClick} icon={CloseIcon}></IconButton>
				</div>
				<img class="mb-4" src={ErrorIcon} alt="error" />
				<div class="text-xl">There was an error during processing!</div>
			{/if}
		</div>
	</div>
{/if}
