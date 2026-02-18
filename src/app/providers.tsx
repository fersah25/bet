'use client';

import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <OnchainKitProvider
            apiKey={process.env.NEXT_PUBLIC_ONCHAIN_KIT_API_KEY}
            chain={base}
        >
            {children}
        </OnchainKitProvider>
    );
}