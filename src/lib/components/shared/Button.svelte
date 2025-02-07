<script lang="ts">
	export let text: string = '';
	export let disabled: boolean = false;
	export let onClickCallback = (e: Event) => {};
</script>

<button
	on:click={onClickCallback}
	{disabled}
	class="button px-4 py-2 font-medium leading-5 rounded-lg cursor-pointer bg-background-button hover:bg-background-button-hover text-text-button hover:text-text-button-hover"
>
	{text}
</button>
