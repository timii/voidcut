<script lang="ts">
	import { callFfmpeg } from '$lib/utils/ffmpeg.utils';
	import { aboutOverlayOpen, exportOverlayOpen, timelineTracks } from '../../../stores/store';
	import Button from '../shared/Button.svelte';
	import AppIcon from '$lib/assets/general/icon-white-50.png';
	import AboutIcon from '$lib/assets/header/about.png';
	import ExportIcon from '$lib/assets/header/export.png';
	import IconButton from '../shared/IconButton.svelte';
	import { updateBackup } from '$lib/utils/persistence.utils';

	async function onExportButtonClick(e: Event) {
		exportOverlayOpen.set(true);
		await callFfmpeg();
	}

	// updates the current state in local storage, mainly used for testing
	function onBackupClicked() {
		updateBackup();
	}

	function onAboutButtonClick(e: Event) {
		aboutOverlayOpen.set(true);
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
		<!-- TODO: hide for production -->
		<Button text={'Backup'} onClickCallback={onBackupClicked}></Button>
		<IconButton icon={AboutIcon} size={20} onClickCallback={onAboutButtonClick}></IconButton>
		<Button
			text={'Export'}
			onClickCallback={onExportButtonClick}
			icon={ExportIcon}
			disabled={$timelineTracks.length < 1}
		></Button>
	</div>
</div>
