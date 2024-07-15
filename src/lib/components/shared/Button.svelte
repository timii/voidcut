<script lang="ts">
	export let text: string = '';
	export let disabled: boolean = false;
	export let onClickCallback = () => {};
</script>

<button
	on:click={onClickCallback}
	{disabled}
	class="px-2 py-[2px] rounded cursor-pointer bg-background-color-lighter hover:bg-background-color-lightest"
>
	{text}
</button>
