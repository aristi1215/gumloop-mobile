import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

export function QueryProvider({ children }: PropsWithChildren) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 10_000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      }),
    [],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
