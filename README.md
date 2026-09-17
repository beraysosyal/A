# BERAY_US PWA

Bu paket, gerçek bir kernel/işletim sistemi değil; Chrome/Edge üzerinden bilgisayara kurulabilen bir PWA masaüstü kabuğudur.

## Çalıştırma

PWA'ların servis worker ve install özelliği için siteyi HTTPS üzerinden yayınlamak gerekir (localhost geliştirme için çalışır).

Dosyaları bir HTTPS alan adına yükleyin. Chrome'da siteyi açıp:
- Chrome menüsü → "BERAY_US'u yükle"
- veya uygulamanın içinde çıkan "Yükle" düğmesi

## Bu sürümde

- PWA `standalone` masaüstü görünümü
- Hafif animasyonlu duvar kâğıdı
- Başlat menüsü
- Dosyalar penceresi
- Ayarlar
- IndexedDB ile yerel kayıt
- Kalıcı depolama isteği
- JSON yedekleme / geri yükleme
- Google simgesi: Google yeni sekmede açılır, BERAY_US sekmesi kapanmaz
- Tam ekran düğmesi
- İstenen Ctrl+Shift+AltGr kısayolu için tarayıcı izin verdiği ölçüde yakalama ve alternatif Ctrl+Shift+Alt+Q

## Önemli tarayıcı sınırları

Bir PWA kurulurken tarayıcı "tüm erişimleri" tek seferde zorla vermez. Kamera, mikrofon, konum, bildirim, dosya erişimi vb. yetkiler gerektiğinde ve kullanıcı eylemiyle ayrı ayrı istenir.

Ayrıca standart PWA, bilgisayardaki diğer uygulamaları kontrol eden gerçek bir işletim sistemi değildir. `google.com` bir butonla yeni sekmede açılır; PWA'nın kendisi açık kalır.

## BERAY_US bulut kaydı

Bu paket özel verileri kendiliğinden internet üzerindeki bir sunucuya göndermez. Bilgisayarda IndexedDB kullanır. "Hem bilgisayara hem BERAY_US sunucusuna kaydetme" özelliği için güvenli bir backend API veya Supabase bağlamak gerekir. Uygulama tarafı buna ayrılacak şekilde yapılandırılmıştır.
