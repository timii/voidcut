<script lang="ts">
	export let icon: string = '';
	export let alt: string = '';
	export let onClickCallback = () => {};
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div on:click={onClickCallback} class="cursor-pointer">
	<img src={icon} {alt} />
</div>
