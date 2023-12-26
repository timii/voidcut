<script lang="ts">
	import Timeline from '$lib/components/Timeline/Timeline.svelte';
	import MediaPool from '$lib/components/Workbench/MediaPool.svelte';
</script>

<main class="flex flex-col h-screen w-screen gap-1 max-w-screen">
	<div class="flex flex-1 basis-2/3">
		<div class="workbench border-2 p-4 flex-1 basis-1/3">
			<MediaPool></MediaPool>
		</div>
		<div class="preview flex-1 border-2 p-4 basis-2/3">preview</div>
	</div>
	<div class="timeline border-2 pt-4 flex-1 basis-1/3">
		<Timeline></Timeline>
	</div>
</main>
