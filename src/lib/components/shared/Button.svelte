<script lang="ts">
	export let text: string = '';
	export let disabled: boolean = false;
	export let onClickCallback = (e: Event) => {};
</script>

<button
	on:click={onClickCallback}
	{disabled}
	class="px-4 py-2 font-medium leading-5 rounded-lg cursor-pointer bg-background-color-light hover:bg-button-background-hover"
>
	{text}
</button>
