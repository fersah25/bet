import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '@/lib/supabaseClient';

export interface UserProfile {
    wallet_address: string;
    username: string | null;
    email: string | null;
    avatar_url: string | null;
    privy_user_id: string | null;
}

export function useUserSync() {
    const { user, ready, authenticated } = usePrivy();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        async function syncUser() {
            if (!ready) return;

            if (!authenticated || !user?.wallet?.address) {
                setUserProfile(null);
                return;
            }

            const walletAddress = user.wallet.address;
            const email = user.email ? user.email.address : null; // Access email address
            const privyId = user.id;

            setIsSyncing(true);
            try {
                // 1. Check if user exists
                const { data: existingUser, error: fetchError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('wallet_address', walletAddress)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') {
                    console.error('Error fetching user:', fetchError);
                }

                if (existingUser) {
                    // Update email/privy_id if missing or changed
                    if (existingUser.email !== email || existingUser.privy_user_id !== privyId) {
                        await supabase
                            .from('users')
                            .update({ email: email, privy_user_id: privyId })
                            .eq('wallet_address', walletAddress);
                    }
                    // Use the updated data (or existing if no update needed, simplified here)
                    setUserProfile({ ...existingUser, email, privy_user_id: privyId } as UserProfile);
                } else {
                    // 2. Create new user
                    const newUser = {
                        wallet_address: walletAddress,
                        username: email ? email.split('@')[0] : `User ${walletAddress.slice(0, 6)}...`,
                        email: email,
                        privy_user_id: privyId,
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
    }, [user, ready, authenticated]);

    return { userProfile, isSyncing };
}
