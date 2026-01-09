import { createClient } from '@supabase/supabase-js';

// TEMPORÁRIO: Credenciais hardcoded para debug
// TODO: Mover para variáveis de ambiente após confirmar funcionamento
const supabaseUrl = 'https://hswuafrnzgvuqyrxouvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzd3VhZnJuemd2dXF5cnhvdXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Mjc1NjEsImV4cCI6MjA4MzUwMzU2MX0.iOl7PsJB9UqSaJ9jPhOIR4skO44J80J_ySOCvMOYpT8';

console.log('🔧 Supabase Client Inicializado');
console.log('🔧 URL:', supabaseUrl);
console.log('🔧 Key:', supabaseKey.substring(0, 20) + '...');

export const supabase = createClient(supabaseUrl, supabaseKey);
