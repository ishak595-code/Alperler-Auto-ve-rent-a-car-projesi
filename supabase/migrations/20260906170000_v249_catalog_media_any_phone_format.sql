-- V249: Vitrin medyası, telefon fotoğrafı/videoyu nasıl çektiyse öyle yüklenir.
-- Depolama kovası artık MIME türü listesiyle reddetmez (tarayıcı tarafı HEIC/HEIF ve SVG'yi
-- açıklamalı olarak reddeder). Boyut tavanı V246 ile 200 MB olarak kalır.
-- İstemci ve sunucu aynı kuralı taşır: çözünürlük veya boyut kısıtı yoktur.
update storage.buckets
set allowed_mime_types = null,
    file_size_limit = 209715200
where id = 'catalog-media';
