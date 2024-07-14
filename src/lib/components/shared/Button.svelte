<script lang="ts">
	export let text: string = '';
	export let onClickCallback = () => {};
</script>

<button
	on:click={onClickCallback}
	class="px-2 py-[2px] rounded cursor-pointer bg-background-color-lighter hover:bg-background-color-lightest"
>
	{text}
</button>
