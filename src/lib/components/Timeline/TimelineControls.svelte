<script lang="ts">
</script>

<div class="timeline-controls flex flex-row p-1 border">
	<div class="flex-1">element controls</div>
	<div class="flex-1 text-center">time</div>
	<div class="flex-1 text-right">
		<div class="flex gap-3 justify-end mr-12 text-lg">
			<div class="increase-scale cursor-pointer" on:click={increaseTimelineScale}>+</div>
			<div class="decrease-scale cursor-pointer" on:click={decreaseTimelineScale}>-</div>
		</div>
	</div>
</div>
