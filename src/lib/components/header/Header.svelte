<script lang="ts">
	import { callFfmpeg } from '$lib/utils/ffmpeg.utils';
	import { exportOverlayOpen } from '../../../stores/store';
	import Button from '../shared/Button.svelte';
	import AppIcon from '$lib/assets/general/icon-white-50.png';
	import ExportIcon from '$lib/assets/header/export.png';

	async function onExportButtonClick(e: Event) {
		exportOverlayOpen.set(true);
		await callFfmpeg();
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

	<Button text={'Export'} onClickCallback={onExportButtonClick} icon={ExportIcon}></Button>
</div>
