<script lang="ts">
	import { callFfmpeg } from '$lib/utils/ffmpeg.utils';
	import { exportOverlayOpen } from '../../../stores/store';
	import Button from '../shared/Button.svelte';

	async function onExportButtonClick() {
		exportOverlayOpen.set(true);
		// await callFfmpeg();
	}
</script>

<div class="flex items-center justify-between px-4 py-1 header">
	<!-- TODO: add name and logo -->
	<div>Name and logo</div>
	<Button text={'Export'} onClickCallback={onExportButtonClick}></Button>
</div>
