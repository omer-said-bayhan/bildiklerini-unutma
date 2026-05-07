// ============================================
// 🔗 SUPABASE CLIENT (GLOBAL VERSION)
// ============================================
// index.html içinde yüklenen @supabase/supabase-js kütüphanesini kullanır

(function() {
    const DEFAULT_SUPABASE_URL = '';
    const DEFAULT_SUPABASE_ANON_KEY = '';
    const runtimeConfig = window.SUPABASE_CONFIG || {};
    const hasRuntimeConfig = Boolean(runtimeConfig.url || runtimeConfig.anonKey);
    const configSource = hasRuntimeConfig ? 'runtime' : 'default';
    const SUPABASE_URL = (runtimeConfig.url || DEFAULT_SUPABASE_URL || '').trim();
    const SUPABASE_ANON_KEY = (runtimeConfig.anonKey || DEFAULT_SUPABASE_ANON_KEY || '').trim();

    function isValidSupabaseUrl(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:' && parsed.hostname.includes('supabase.co');
        } catch (_) {
            return false;
        }
    }

    function isLikelyJwt(token) {
        if (!token || typeof token !== 'string') return false;
        const parts = token.split('.');
        return parts.length === 3 && token.length > 100;
    }

    try {
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase kütüphanesi yüklenemedi!');
        }
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            throw new Error('Supabase URL veya ANON KEY eksik. supabase-config.js dosyasini doldurun.');
        }
        if (!isValidSupabaseUrl(SUPABASE_URL)) {
            throw new Error('Supabase URL geçersiz. https://<project>.supabase.co formatı gerekli.');
        }
        if (!isLikelyJwt(SUPABASE_ANON_KEY)) {
            throw new Error('Supabase ANON KEY geçersiz görünüyor (JWT formatı bekleniyor).');
        }
        if (!hasRuntimeConfig) {
            console.warn('🔗 window.SUPABASE_CONFIG bulunamadı, default Supabase ayarları kullanılıyor.');
        }
        
        const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = client;
        window.supabaseStatus = { ready: true, url: SUPABASE_URL, source: configSource };
        window.supabaseConnectionInfo = { url: SUPABASE_URL, source: configSource };
        window.dispatchEvent(new CustomEvent('supabaseReady'));
        console.log(`🔗 Supabase client initialized — URL: ${SUPABASE_URL} (source: ${configSource})`);
    } catch (error) {
        window.supabaseStatus = { ready: false, error: error.message, url: SUPABASE_URL, source: configSource };
        console.error('🔗 Supabase initialization error:', error);
    }
})();
