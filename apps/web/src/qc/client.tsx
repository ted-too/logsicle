"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "./query-client";

export function TanstackQueryProvider(
	props: Readonly<{
		children: React.ReactNode;
	}>,
) {
	const queryClient = getQueryClient();
	return (
		<QueryClientProvider client={queryClient}>
			{props.children}
			{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	);
}
