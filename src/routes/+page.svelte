<script lang="ts">
	import Timeline from '$lib/components/Timeline/Timeline.svelte';
	import MediaPool from '$lib/components/Workbench/MediaPool.svelte';
</script>

<main class="grid h-screen w-screen gap-1">
	<div class="workbench border-2 p-4 row-span-2">
		<MediaPool></MediaPool>
	</div>
	<div class="preview border-2 p-4 row-span-2 col-span-2">preview</div>
	<div class="timeline border-2 p-4 col-span-3">
		<Timeline></Timeline>
	</div>
</main>
