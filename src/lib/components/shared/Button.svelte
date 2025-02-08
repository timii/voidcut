<script lang="ts">
	export let text: string = '';
	export let icon: string = '';
	export let disabled: boolean = false;
	export let onClickCallback = (e: Event) => {};
</script>

<button
	on:click={onClickCallback}
	{disabled}
	class="button px-4 py-2 font-medium rounded-lg cursor-pointer flex items-center gap-2 bg-background-button hover:bg-background-button-hover text-text-button hover:text-text-button-hover"
>
	{#if icon}
		<img src={icon} alt="Button Icon" width="16" />
	{/if}
	{text}
</button>
