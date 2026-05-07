// ============================================
// 🔗 SUPABASE CLIENT (GLOBAL VERSION)
// ============================================
// index.html içinde yüklenen @supabase/supabase-js kütüphanesini kullanır

(function() {
    const SUPABASE_URL = 'https://zemaimsxlduhddizitjy.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplbWFpbXN4bGR1aGRkaXppdGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NzgxMDYsImV4cCI6MjA5MjQ1NDEwNn0.CSHgxqUthROkaRGD3BvFFechJG9i2hFKcwjEEsI3nHY';

    try {
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase kütüphanesi yüklenemedi!');
        }
        
        const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = client;
        window.dispatchEvent(new CustomEvent('supabaseReady'));
        console.log('🔗 Supabase client initialized — URL:', SUPABASE_URL);
    } catch (error) {
        console.error('🔗 Supabase initialization error:', error);
    }
})();
