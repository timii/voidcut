<script lang="ts">
	export let text: string = '';
	export let disabled: boolean = false;
	export let onClickCallback = () => {};
</script>

<button
	on:click={onClickCallback}
	{disabled}
	class="px-4 py-2 font-medium leading-5 rounded cursor-pointer bg-background-color-lighter hover:bg-background-color-lightest"
>
	{text}
</button>
