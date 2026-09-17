# BERAY_US PRO — PWA Desktop Core 0.3

Bu paket BERAY_US'u Chrome/Edge içinde kurulabilen, gerçek bir masaüstü uygulaması hissi veren PWA çalışma alanına yükseltir.

## Öne çıkanlar
- Pencere sistemi: aç/kapat/küçült/büyüt, sürükle, yeniden boyutlandır
- Dahili Web uygulaması ve Google çalışma paneli
- Başlat menüsü + uygulama arama
- Görev çubuğu ve açık uygulama yönetimi
- Hızlı Ayarlar + bildirim merkezi
- Notlar (IndexedDB)
- Dosya alanı (kullanıcı seçimiyle)
- Sistem durumu ve yerel günlük
- Ayarlar, hareket, parlaklık, vurgu rengi, bildirim ve kalıcı depolama talepleri
- PWA install prompt
- Service Worker ile temel çevrimdışı kabuk
- Özel BERAY_US ikonları

## Yayınlama
PWA'nın Service Worker ve kurulum özellikleri için HTTPS üzerinden yayınlayın. GitHub Pages, Netlify, Vercel vb. HTTPS sunan bir statik host kullanılabilir.

## Google hakkında
Google için pencerenin içine gerçek bir iframe yerleştirildi: `https://www.google.com/search?igu=1`.
Bu parametre geçmişte topluluk tarafından iframe senaryolarında kullanılmıştır; resmi bir Google PWA API'si değildir ve gelecekte çalışmayabilir. Hedef site iframe'i CSP/X-Frame-Options ile engellerse BERAY_US bunu algılayıp güvenli bir geri dönüş düğmesi gösterir.

## Önemli
Bu PWA bir bilgisayarın gerçek kernel'i değildir. Tarayıcı sandbox'ı nedeniyle işletim sistemi çekirdeği, ekran kartı sürücüsü, tüm disk üzerinde sessiz dosya erişimi veya tüm tarayıcı kısayollarını zorla ele geçirme gibi yetkiler vermez.
