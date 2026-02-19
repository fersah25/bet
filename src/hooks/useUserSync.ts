import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';

export interface UserProfile {
    wallet_address: string;
    username: string | null;
    avatar_url: string | null;
}

export function useUserSync() {
    const { address, isConnected } = useAccount();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        async function syncUser() {
            if (!isConnected || !address) {
                setUserProfile(null);
                return;
            }

            setIsSyncing(true);
            try {
                // 1. Check if user exists
                const { data: existingUser, error: fetchError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('wallet_address', address)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
                    console.error('Error fetching user:', fetchError);
                }

                if (existingUser) {
                    // User exists
                    setUserProfile(existingUser as UserProfile);
                } else {
                    // 2. Create new user
                    const newUser = {
                        wallet_address: address,
                        username: `User ${address.slice(0, 6)}...`,
                        avatar_url: null
                    };

                    const { data: createdUser, error: insertError } = await supabase
                        .from('users')
                        .insert([newUser])
                        .select()
                        .single();

                    if (insertError) {
                        console.error('Error creating user:', insertError);
                    } else {
                        setUserProfile(createdUser as UserProfile);
                    }
                }
            } catch (err) {
                console.error('Unexpected error syncing user:', err);
            } finally {
                setIsSyncing(false);
            }
        }

        syncUser();
    }, [address, isConnected]);

    return { userProfile, isSyncing };
}
