<script lang="ts">
	import TimelineRow from './TimelineRow.svelte';
	import TimelineRuler from './TimelineRuler.svelte';
</script>

<div class="timeline-container flex flex-col h-full gap-2">
	<!-- Timeline Controls -->
	<div class="timeline-controls flex flex-row p-1 border">
		<div class="flex-1">element controls</div>
		<div class="flex-1 text-center">time</div>
		<div class="flex-1 text-right">timeline controls</div>
	</div>

	<!-- Timeline Tracks -->
	<div class="timeline-tracks h-full rounded flex flex-col gap-1 min-w-full">
		<TimelineRuler></TimelineRuler>
		<TimelineRow></TimelineRow>
		<!-- <div class="timeline-row"></div>
		<div class="timeline-row"></div>
		<div class="timeline-row"></div> -->
	</div>
</div>
