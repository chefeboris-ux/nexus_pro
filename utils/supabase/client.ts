import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hswuafrnzgvuqyrxouvu.supabase.co';
const supabaseKey = 'sb_publishable_fW1qDjXOr4HT15j874OieA_SPTYbe6n';

export const supabase = createClient(supabaseUrl, supabaseKey);
