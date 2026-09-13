<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LucideIcon } from '@lucide/svelte';

  import { Label } from '$components/ui/label';
  import { cn } from '$lib/utils';

  type Props = {
    icon: LucideIcon;
    label: string;
    class?: string;
    children: Snippet<[]>;
    [key: string]: unknown;
  };

  const { icon: Icon, label, children, class: className, ...restProps }: Props = $props();
</script>

<div class={cn('flex items-center gap-2.5', className)} {...restProps}>
  <Icon />
  <div class="flex flex-col gap-1.5">
    <Label class="text-muted-foreground">{label}</Label>
    <div class="text-sm font-medium">
      {@render children()}
    </div>
  </div>
</div>
