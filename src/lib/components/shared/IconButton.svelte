<script lang="ts">
	export let icon: string = '';
	export let alt: string = '';
	export let size = 26;
	export let onClickCallback = (e: Event) => {};
</script>

<button
	on:click={onClickCallback}
	class="cursor-pointer rounded p-[2px] hover:bg-background-color-lighter"
>
	<img src={icon} {alt} width={size} />
</button>
