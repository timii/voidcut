<script lang="ts">
	import { aboutOverlayOpen } from '../../../stores/store';
	import IconButton from '../shared/IconButton.svelte';
	import CloseIcon from '$lib/assets/header/close.png';
	import GithubIcon from '$lib/assets/header/github.png';
	import AppIcon from '$lib/assets/general/icon-white-50.png';
	import ExternalLink from '../shared/ExternalLink.svelte';

	export let open = false;

	const version = __VERSION__;

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
			class="fixed -translate-x-1/2 -translate-y-1/2 about-dialog bg-background-highlight text-text-highlight top-1/2 left-1/2 h-[300px] w-[400px] rounded-2xl p-8 gap-3 flex flex-col items-center justify-center"
			on:click={(e) => e.stopPropagation()}
		>
			<div class="absolute right-8 top-6">
				<IconButton onClickCallback={closeDialog} icon={CloseIcon}></IconButton>
			</div>

			<div class="bg-accent-color p-2 rounded-2xl mb-2">
				<img src={AppIcon} alt="logo" width="46" />
			</div>

			<div class="flex justify-center items-center gap-1">
				Created by
				<ExternalLink link="https://github.com/timii">
					<IconButton icon={GithubIcon}></IconButton>
					timii
				</ExternalLink>
			</div>

			<div class="flex justify-center items-center gap-1">
				Icons by <ExternalLink link="https://icons8.com/">Icons8</ExternalLink>
			</div>

			<div>Version: {version}</div>

			<div class="flex justify-center items-center gap-1">
				License:
				<ExternalLink link="https://github.com/timii/voidcut/blob/main/LICENSE">MIT</ExternalLink>
			</div>
		</div>
	</div>
{/if}
