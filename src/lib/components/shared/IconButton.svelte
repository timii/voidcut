<script lang="ts">
	import Tooltip from './Tooltip.svelte';

	export let icon: string = '';
	export let alt: string = '';
	export let tooltipText: string = '';
	export let size = 24;
	export let disabled = false;
	export let onClickCallback = (e: Event) => {};
</script>

<!-- only show a tooltip if tooltipText is given -->
{#if tooltipText}
	<Tooltip text={tooltipText}>
		<button
			on:click={onClickCallback}
			{disabled}
			class="cursor-pointer rounded p-[4px] hover:bg-background-color-lighter disabled:opacity-50 disabled:pointer-events-none"
			style="width: {size}px;"
		>
			<img src={icon} {alt} width="100%" class="object-cover" />
		</button>
	</Tooltip>
{:else}
	<button
		on:click={onClickCallback}
		{disabled}
		class="cursor-pointer rounded p-[4px] hover:bg-background-color-lighter disabled:opacity-50 disabled:pointer-events-none"
	>
		<img src={icon} {alt} width={size} />
	</button>
{/if}
