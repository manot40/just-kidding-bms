<script lang="ts">
  import * as bms from '$lib/bms.svelte';

  const devFlags = $derived(bms.status.devFlags);
</script>

{#snippet StateBlock(flag: boolean, label: string, cn?: string)}
  <div class="py-2.5 font-medium {cn}">
    {label}
    <span class="uppercase {flag ? 'text-destructive' : 'text-green-600'}">{flag ? 'On' : 'Off'}</span>
  </div>
{/snippet}

<section id="flags" class="grid grid-cols-3 border-b text-center text-sm">
  {@render StateBlock(devFlags.isCharging, 'Charge', 'border-r')}
  {@render StateBlock(devFlags.isDischarging, 'Discharge', 'border-r')}
  {@render StateBlock(devFlags.isBalancing, 'Balance')}
</section>
