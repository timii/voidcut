<script lang="ts">
	import { callFfmpeg } from '$lib/utils/ffmpeg.utils';
	import Button from '../shared/Button.svelte';
</script>

<div class="flex items-center justify-between px-4 py-1 header">
	<!-- TODO: add name and logo -->
	<div>Name and logo</div>
	<Button text={'Export'} onClickCallback={callFfmpeg}></Button>
</div>
