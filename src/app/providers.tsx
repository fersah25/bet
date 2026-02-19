'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider } from '@privy-io/react-auth';
import { baseSepolia } from 'viem/chains';
import React, { type ReactNode } from 'react';

// Set up queryClient
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
    return (
        <PrivyProvider
            appId="cmltq3xy7010f0djv5tjmtukw"
            config={{
                appearance: {
                    theme: 'light',
                    accentColor: '#676FFF',
                    logo: 'https://avatars.githubusercontent.com/u/179229932',
                },
                loginMethods: ['email', 'wallet', 'google', 'apple'],
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: 'users-without-wallets',
                    },
                },
                defaultChain: baseSepolia,
                supportedChains: [baseSepolia],
            }}
        >
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </PrivyProvider>
    );
}