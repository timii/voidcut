<script lang="ts">
	import { aboutOverlayOpen } from '../../../stores/store';
	import IconButton from '../shared/IconButton.svelte';
	import CloseIcon from '$lib/assets/header/close.png';
	import GithubIcon from '$lib/assets/header/github.png';

	export let open = false;

	function closeDialog(e: Event) {
		e.stopPropagation();
		aboutOverlayOpen.set(false);
	}
</script>

{#if open}
	<div
		class="absolute top-0 left-0 z-10 w-full h-full bg-opacity-80 bg-backdrop-color about-dialog-bg"
		on:click={closeDialog}
	>
		<div
			class="fixed -translate-x-1/2 -translate-y-1/2 about-dialog bg-background-highlight text-text-highlight top-1/2 left-1/2 h-[400px] w-[700px] rounded-2xl p-8 gap-3 flex flex-col items-center justify-center"
			on:click={(e) => e.stopPropagation()}
		>
			<div class="absolute right-8 top-6">
				<IconButton onClickCallback={closeDialog} icon={CloseIcon}></IconButton>
			</div>
			<div class="flex justify-center items-center gap-1">
				Created by timii
				<a
					href="https://github.com/timii"
					target="_blank"
					rel="author"
					on:click={(e) => e.stopPropagation()}
				>
					<span><IconButton icon={GithubIcon}></IconButton></span></a
				>
			</div>
		</div>
	</div>
{/if}
