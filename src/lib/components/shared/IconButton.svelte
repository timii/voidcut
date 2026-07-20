<script lang="ts">
	import type { TooltipPlacement } from '$lib/interfaces/Tooltip';
	import Tooltip from './Tooltip.svelte';

	export let icon: string = '';
	export let alt: string = '';
	export let tooltipText: string = '';
	export let tooltipPlacement: TooltipPlacement = 'top';
	export let size = 24;
	export let disabled = false;
	export let onClickCallback: (event: Event) => unknown = () => undefined;
</script>

<!-- only show a tooltip if tooltipText is given -->
{#if tooltipText}
	<Tooltip text={tooltipText} placement={tooltipPlacement}>
		<button
			on:click={onClickCallback}
			{disabled}
			class="cursor-pointer rounded p-[4px] hover:bg-background-icon-button disabled:opacity-50 disabled:pointer-events-none"
			style="width: {size}px;"
		>
			<img src={icon} {alt} width="100%" class="object-cover" />
		</button>
	</Tooltip>
{:else}
	<button
		on:click={onClickCallback}
		{disabled}
		class="cursor-pointer rounded p-[4px] hover:bg-background-icon-button disabled:opacity-50 disabled:pointer-events-none"
	>
		<img src={icon} {alt} width={size} />
	</button>
{/if}
