<script lang="ts">
	export let icon: string = '';
	export let alt: string = '';
	export let size = 26;
	export let disabled = false;
	export let onClickCallback = (e: Event) => {};
</script>

<button
	on:click={onClickCallback}
	{disabled}
	class="cursor-pointer rounded p-[2px] hover:bg-background-color-lighter disabled:opacity-50 disabled:pointer-events-none"
>
	<img src={icon} {alt} width={size} />
</button>
