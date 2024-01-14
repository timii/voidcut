<script lang="ts">
	export let icon: string = '';
	export let alt: string = '';
	export let onClickCallback = () => {};
</script>

<button
	on:click={onClickCallback}
	class="cursor-pointer rounded p-[2px] hover:bg-background-color-lighter"
>
	<img src={icon} {alt} />
</button>
