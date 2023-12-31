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
	<div
		class="timeline-tracks h-full flex flex-col gap-1 w-full overflow-x-scroll overflow-y-scroll"
	>
		<!-- calculate width dynamically and fix width if element overflows -->
		<!-- if container doesn't overflow -> set width of element to be 100% in px -->
		<!-- and pass the calcualted width to the ruler to use it in there on the container element -->
		<div class="timeline-content-container min-w-full h-auto">
			<TimelineRuler></TimelineRuler>
			<div class="flex flex-col gap-3 mb-3 pl-5">
				<div class="bg-red-700 h-[50px] w-[2200px]"></div>
				<div class="bg-red-700 h-[50px] w-[800px]"></div>
				<div class="bg-red-700 h-[50px] w-[600px] translate-x-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[200px] translate-x-[50px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
				<div class="bg-red-700 h-[50px] w-[300px]"></div>
			</div>
			<!-- <TimelineRow></TimelineRow> -->
			<!-- <div class="timeline-row"></div>
				<div class="timeline-row"></div>
				<div class="timeline-row"></div> -->
		</div>
	</div>
</div>
