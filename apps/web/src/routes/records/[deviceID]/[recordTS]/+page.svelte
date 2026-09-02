<script lang="ts">
  import type { PageProps } from './$types';

  let { params, data }: PageProps = $props();
</script>

<code>{JSON.stringify(data, null, 2)}</code>
