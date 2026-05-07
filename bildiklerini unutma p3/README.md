# Bildiklerini Unutma - Spaced Repetition App

Aralıklı tekrar yöntemi ile kalıcı öğrenme uygulaması.

## Özellikler

- 🧠 **Akıllı Tekrar Sistemi**: Ebbinghaus unutma eğrisine göre kelimelerinizi tam zamanında tekrar edin
- 📁 **Organize Klasörler**: Kelimelerinizi konulara göre düzenleyin ve alt klasörler oluşturun
- 🎯 **Çeşitli Quiz Türleri**: Hızlı quiz, zorluk bazlı quiz ve daha fazlası ile kendinizi test edin
- 📊 **Detaylı İstatistikler**: İlerlemenizi takip edin ve öğrenme başarınızı görün
- 🔔 **Akıllı Hatırlatmalar**: Tekrar zamanı geldiğinde size bildirim gönderir
- 🌙 **Dark Mode**: Karanlık ve aydınlık tema desteği
- 🌍 **Çoklu Dil**: 5 farklı dil desteği (Türkçe, İngilizce, Fransızca, İspanyolca, Arapça)
- ☁️ **Cloud Storage**: JSONBin.io ile cihazlar arası senkronizasyon
- 📱 **PWA**: Progressive Web App - telefona yüklenebilir
- 🎓 **Tutorial**: İlk kullanıcılar için rehberli tanıtım

## Teknolojiler

- HTML5, CSS3, JavaScript (Vanilla)
- TailwindCSS
- Chart.js
- JSONBin.io (Cloud Storage)
- PWA (Progressive Web App)

## Netlify Deployment

Bu uygulama Netlify'de çalışacak şekilde optimize edilmiştir:

1. `index.html` - Ana uygulama dosyası (JSONBin.io cloud storage ile)
2. `phone-app-updated.html.html` - Orijinal dosya (değiştirilmedi)
3. `manifest.json` - PWA manifest dosyası
4. `sw.js` - Service Worker (caching için)
5. `netlify.toml` - Netlify konfigürasyonu
6. `_redirects` - SPA routing için yönlendirmeler

## Kullanım

1. E-mail ve şifre ile hesap oluşturun
2. Klasörler oluşturup kelimelerinizi organize edin
3. Düzenli olarak quiz çözün
4. İlerlemenizi istatistikler sekmesinden takip edin

## Cloud Storage

- JSONBin.io API kullanılarak veriler bulutta saklanır
- Cihazlar arası otomatik senkronizasyon
- Her kullanıcı için ayrı veri bin'i oluşturulur
- Güvenli şifre hash'leme (SHA-256)

## Lisans

MIT License