import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    const btcCandidates = [
        {
            candidate_name: 'Yes',
            initials: 'Y',
            color: '#00d395',
            pool_amount: 0,
            category: 'bitcoin'
        },
        {
            candidate_name: 'No',
            initials: 'N',
            color: '#ff4d4d',
            pool_amount: 0,
            category: 'bitcoin'
        }
    ];

    for (const candidate of btcCandidates) {
        const { data, error } = await supabase
            .from('markets')
            .insert([candidate])
            .select();

        if (error) {
            console.error('Error inserting:', candidate.candidate_name, error);
        } else {
            console.log('Inserted:', data);
        }
    }
}

seed();
