import type { Decorator } from "@storybook/tanstack-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { AuthProvider } from "@/features/auth/AuthProvider";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export const withProviders: Decorator = (Story) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Story />
    </AuthProvider>
  </QueryClientProvider>
);
