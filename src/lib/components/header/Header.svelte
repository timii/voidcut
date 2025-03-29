<script lang="ts">
	import { callFfmpeg } from '$lib/utils/ffmpeg.utils';
	import { aboutOverlayOpen, exportOverlayOpen, timelineTracks } from '../../../stores/store';
	import Button from '../shared/Button.svelte';
	import AppIcon from '$lib/assets/general/icon-white-50.png';
	import AboutIcon from '$lib/assets/header/about.png';
	import ExportIcon from '$lib/assets/header/export.png';
	import IconButton from '../shared/IconButton.svelte';
	import { clearStorage, getState, updateState } from '$lib/utils/persistence.utils';
	import { isProduction } from '$lib/utils/utils';

	async function openExportDialog() {
		exportOverlayOpen.set(true);
		await callFfmpeg();
	}

	function openAboutDialog() {
		aboutOverlayOpen.set(true);
	}

	// updates the current state in local storage, mainly used for testing
	async function saveCurrentState() {
		await updateState();
	}

	// get the current state from local storage, mainly used for testing
	async function getLastSavedState() {
		await getState();
	}

	// clear local storage, mainly used for testing
	function onClearStorage() {
		clearStorage();
	}
</script>

<div
	class="flex items-center justify-between px-4 py-3 header bg-background-highlight rounded-b-xl"
>
	<div class="flex items-center gap-1">
		<div class="bg-accent-color p-1 rounded">
			<img src={AppIcon} alt="logo" width="24" />
		</div>
	</div>

	<div class="flex justify-center items-center gap-4">
		{#if !isProduction()}
			<Button text={'Save'} onClickCallback={saveCurrentState}></Button>
			<Button text={'Get'} onClickCallback={getLastSavedState}></Button>
			<Button text={'Clear'} onClickCallback={onClearStorage}></Button>
		{/if}
		<IconButton icon={AboutIcon} size={20} onClickCallback={openAboutDialog}></IconButton>
		<Button
			text={'Export'}
			onClickCallback={openExportDialog}
			icon={ExportIcon}
			disabled={$timelineTracks.length < 1}
		></Button>
	</div>
</div>
