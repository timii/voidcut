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

<style lang="postcss">
	/* TODO try out cool box shadow on hover */
	/* .button:hover {
		-webkit-box-shadow: inset 0px 0px 5px 2px rgba(21, 21, 25, 1);
		-moz-box-shadow: inset 0px 0px 5px 2px rgba(21, 21, 25, 1);
		box-shadow: inset 0px 0px 5px 2px rgba(21, 21, 25, 1);
	} */

	/* .button:hover {
		-webkit-box-shadow: 0px 0px 3px 1px rgba(242, 242, 242, 0.7);
		-moz-box-shadow: 0px 0px 3px 1px rgba(242, 242, 242, 0.7);
		box-shadow: 0px 0px 3px 1px rgba(242, 242, 242, 0.7);
	} */

	.button {
		transition: box-shadow 100ms;
	}
</style>
