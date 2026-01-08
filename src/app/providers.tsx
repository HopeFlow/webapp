"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@/components/toast";
import { DeferredActionProvider } from "./deferred_action_context";
import { RealtimeProvider } from "@/helpers/client/realtime";

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // globally default to 5 minutes
        staleTime: 1000 * 60 * 5,
        refetchOnMount: true,
      },
    },
    // TODO: re-enable global error and success handling
    // queryCache: new QueryCache({
    //   onError: ((error: Error, query: NotificationType) =>
    //     // handleGlobalError(error, query.options)) as QueryErrorProps,
    // }),
    // mutationCache: new MutationCache({
    //   onError: ((error: Error, query: NotificationType) => {
    //     // handleGlobalError(error, query.options)) as MutationErrorProps,
    //   }),
    //   onSuccess: ((_, query: NotificationType) => {
    //     // handleGlobalSuccess(query.options)) as MutationSuccessProps,
    // }),
  });

  return (
    <ClerkProvider>
      <RealtimeProvider>
        <QueryClientProvider client={queryClient}>
          <DeferredActionProvider>
            <ToastProvider>{children}</ToastProvider>
          </DeferredActionProvider>
        </QueryClientProvider>
      </RealtimeProvider>
    </ClerkProvider>
  );
}
