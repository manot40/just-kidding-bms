export type DebounceRef<T> = { value: T };

export function useDebounce<T>(getter: () => T, delay = 300): DebounceRef<T> {
  let debounced = $state<T>(getter());

  $effect(() => {
    const value = getter();
    const timeout = setTimeout(() => {
      debounced = value;
    }, delay);

    return () => clearTimeout(timeout);
  });

  return {
    get value() {
      return debounced;
    },
  };
}
