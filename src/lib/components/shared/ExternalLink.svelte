<script lang="ts">
	export let link;
</script>

<a href={link} target="_blank" class="underline flex justify-center items-center gap-1">
	<slot />
</a>
