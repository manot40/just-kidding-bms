<script lang="ts">
  import './layout.css';

  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="w-full lg:max-w-lg mx-auto">
  {@render children()}
</div>
