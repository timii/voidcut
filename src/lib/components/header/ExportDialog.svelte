<script lang="ts">
	import Button from '../shared/Button.svelte';
	import IconButton from '../shared/IconButton.svelte';
	import CloseIcon from '$lib/assets/header/close.png';
	import SuccessIcon from '$lib/assets/header/complete.png';
	import ErrorIcon from '$lib/assets/header/error.png';
	import {
		exportOverlayOpen,
		exportState,
		ffmpegProgress,
		ffmpegProgressElapsedTime,
		processedFileSize
	} from '../../../stores/store';
	import { ExportState } from '$lib/interfaces/Ffmpeg';
	import { downloadOutput, terminateFfmpegExecution } from '$lib/utils/ffmpeg.utils';
	import { msToHr } from '$lib/utils/utils';

	export let open = false;

	function onClickBackdrop(e: Event) {
		e.stopPropagation();
		console.log('onClickBackdrop');
	}

	async function onCancelClick(e: Event) {
		e.stopPropagation();
		console.log('onCancelClick');
		await terminateFfmpegExecution();
	}

	// function onCloseClick() {
	// 	console.log('onCloseClick');
	// 	exportOverlayOpen.set(false);
	// }

	function onSaveClick(e: Event) {
		e.stopPropagation();
		console.log('onSaveClick');
		downloadOutput();
	}

	function onCloseClick(e: Event) {
		e.stopPropagation();
		console.log('onCloseClick');
		exportOverlayOpen.set(false);
	}
</script>

{#if open}
	<div
		class="absolute top-0 left-0 z-10 w-full h-full bg-opacity-80 bg-background-color-darker export-dialog-bg"
		on:click={onClickBackdrop}
	>
		<div
			class="fixed -translate-x-1/2 -translate-y-1/2 export-dialog bg-background-color-light text-text-color-lightest top-1/2 left-1/2 h-[400px] w-[700px] rounded-2xl p-8 gap-3 flex flex-col items-center justify-center"
		>
			{#if $exportState === ExportState.PROCESSING}
				<div class="text-3xl">Exporting...</div>
				<div class="mb-10 text-lg text-l">Your video is being processed, please wait</div>
				<div class="flex items-center gap-4">
					<div
						class="progress-bar h-4 w-[450px] bg-background-color-darker rounded-sm relative block"
					>
						<span style="width: {$ffmpegProgress}%;" class="block h-full rounded-sm bg-accent-color"
						></span>
					</div>
					<div class="color-accent-color">{$ffmpegProgress}%</div>
				</div>
				<!-- TODO: implement an own timer that counts the elapsed time -->
				<div>Elapsed time: {msToHr($ffmpegProgressElapsedTime)}</div>
				<div class="mt-10">
					<Button text={'Cancel'} onClickCallback={onCancelClick}></Button>
				</div>
			{:else if $exportState === ExportState.COMPLETE}
				<div class="absolute right-8 top-6">
					<IconButton onClickCallback={onCloseClick} icon={CloseIcon}></IconButton>
				</div>
				<img class="mb-4" src={SuccessIcon} alt="complete" />
				<div class="text-xl">Exporting complete</div>
				<!-- TODO: add file infos -->
				<div class="text-sm text-center text-text-color-darkest">
					<div>File size: {$processedFileSize} MB</div>
					<div>Elapsed time: {msToHr($ffmpegProgressElapsedTime)}</div>
				</div>
				<div class="mt-6">
					<!-- TODO: add icon -->
					<Button onClickCallback={onSaveClick} text={'Download'}></Button>
				</div>
			{:else}
				<div class="absolute right-8 top-6">
					<IconButton onClickCallback={onCloseClick} icon={CloseIcon}></IconButton>
				</div>
				<img class="mb-4" src={ErrorIcon} alt="error" />
				<div class="text-xl">There was an error during processing!</div>
				<div class="mt-6">
					<Button onClickCallback={onCloseClick} text={'Close'}></Button>
				</div>
			{/if}
		</div>
	</div>
{/if}
