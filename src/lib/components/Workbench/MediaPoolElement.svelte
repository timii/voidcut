<script lang="ts">
	export let file: File;
</script>

<div class="element-container flex flex-col items-center">
	<div class="media h-24 w-32 rounded bg-red-500"></div>
	<span>{file.name}</span>
</div>
