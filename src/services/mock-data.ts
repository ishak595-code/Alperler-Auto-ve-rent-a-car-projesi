import { Vehicle } from '../models/car.model';
import { BlogPost, FaqItem } from './car.service';

export const fallbackInventory: Vehicle[] = [
  // --- KİRALIK (RENTAL) ARAÇLAR ---
  {
    id: 1001,
    category: 'RENTAL',
    brand: 'Mercedes-Benz',
    model: 'C Serisi (Süslenmiş Gelin Arabası)',
    year: 2023,
    type: 'Sedan',
    transmission: 'Otomatik',
    fuel: 'Benzin',
    price: 6500,
    seats: 5,
    minLicenseYears: 2,
    deposit: 5000,
    dailyMileageLimit: 250,
    isAvailable: true,
    driverOption: 'WITH_DRIVER',
    image: 'https://images.unsplash.com/photo-1549558548-e87f17424ad3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1549558548-e87f17424ad3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1563720360172-67b8f3dce741?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    description: 'Özel günleriniz için özenle süslenmiş şoförlü VIP gelin arabası. Çiçek süslemeleri ve deneyimli şoförümüz fiyata dâhildir.',
    features: ['Şoförlü Hizmet', 'Süsleme Dâhil', 'Klima', 'Deri Koltuklar', 'Sunroof'],
    badge: 'DÜĞÜN PAKETİ',
    isPopular: true,
    isFeatured: true
  },
  {
    id: 1002,
    category: 'RENTAL',
    brand: 'Mercedes-Benz',
    model: 'Vito VIP',
    year: 2022,
    type: 'Minibus',
    transmission: 'Otomatik',
    fuel: 'Dizel',
    price: 8500,
    seats: 9,
    isAvailable: true,
    driverOption: 'WITH_DRIVER',
    image: 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'Geniş aileler, özel gruplar ve turlar için ultra lüks içi yapılı VIP Mercedes Vito. TV, buzdolabı ve özel aydınlatma mevcuttur.',
    features: ['Deri Koltuklar', 'Buzdolabı', 'TV & Multimedya', 'VIP Tasarım', 'Arka Klima'],
    badge: 'VIP',
    isPopular: true,
    isFeatured: true
  },
  {
    id: 1003,
    category: 'RENTAL',
    brand: 'Volkswagen',
    model: 'Amarok Aventura',
    year: 2023,
    type: 'Pickup',
    transmission: 'Otomatik',
    fuel: 'Dizel',
    price: 4500,
    seats: 5,
    isAvailable: true,
    driverOption: 'BOTH',
    image: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'Zorlu arazi şartlarında üstün performans gösteren, 4x4 çekiş sistemine sahip, en dolu paket VW Amarok.',
    features: ['4x4 Çeker', 'Deri Koltuk', 'Arazi Modu', 'Aventura Paket', 'Navigasyon'],
    badge: '4x4 OFFROAD',
    isPopular: true,
    isFeatured: true
  },
  {
    id: 1004,
    category: 'RENTAL',
    brand: 'Renault',
    model: 'Megane',
    year: 2022,
    type: 'Sedan',
    transmission: 'Otomatik',
    fuel: 'Dizel',
    price: 2800,
    seats: 5,
    isAvailable: true,
    driverOption: 'WITHOUT_DRIVER',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'Şehir içi ve uzun yolculuklarınız için konforlu, geniş iç hacimli ve yakıt cimrisi güncel kasa Renault Megane.',
    features: ['Klima', 'Apple CarPlay', 'Hız Sabitleyici', 'Geri Görüş Kamerası'],
    isFeatured: true
  },
  {
    id: 1005,
    category: 'RENTAL',
    brand: 'Volkswagen',
    model: 'Passat',
    year: 2021,
    type: 'Sedan',
    transmission: 'Otomatik',
    fuel: 'Dizel',
    price: 4000,
    seats: 5,
    isAvailable: true,
    driverOption: 'BOTH',
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'Konfor ve prestiji bir arada sunan D segmenti VW Passat. Uzun yol seyahatleri ve iş gezileri için mükemmel tercih.',
    features: ['Deri/Kumaş Koltuk', 'Navigasyon', 'ErgoComfort', 'Üç Bölgeli Klima'],
    badge: 'PREMIUM',
    isPopular: true
  },
  {
    id: 1006,
    category: 'RENTAL',
    brand: 'BMW',
    model: '3.20i',
    year: 2022,
    type: 'Sedan',
    transmission: 'Otomatik',
    fuel: 'Benzin',
    price: 6000,
    seats: 5,
    isAvailable: true,
    driverOption: 'WITHOUT_DRIVER',
    image: 'https://images.unsplash.com/photo-1555008872-f03b347ffb53?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'Sportif sürüş keyfi arayanlar için lüks donanımlı BMW 3.20i. Dinamik performans ve üst düzey konfor.',
    features: ['M Sport Paket', 'Hayalet Ekran', 'Sunroof', 'Harman/Kardon', 'Sürüş Asistanları'],
    badge: 'SPORT',
    isFeatured: true
  },
  {
    id: 1007,
    category: 'RENTAL',
    brand: 'Ford',
    model: 'Focus',
    year: 2021,
    type: 'Sedan',
    transmission: 'Otomatik',
    fuel: 'Dizel',
    price: 2500,
    seats: 5,
    isAvailable: true,
    driverOption: 'WITHOUT_DRIVER',
    image: 'https://images.unsplash.com/photo-1522818610332-9cbceeb97b1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'Eşsiz yol tutuşu ve verimli motoruyla sınıf lideri Ford Focus. Hem aileler hem de iş seyahatleri için ideal.',
    features: ['Geniş Bagaj', 'Apple CarPlay', 'Otomatik Vites', 'Sürüş Modları']
  },

  // --- SATILIK (SALE) ARAÇLAR ---
  {
    id: 2001,
    category: 'SALE',
    brand: 'Audi',
    model: 'A3',
    series: 'Sportback 35 TFSI',
    year: 2022,
    type: 'Hatchback',
    transmission: 'Otomatik',
    fuel: 'Benzin',
    price: 2150000,
    km: 25000,
    engineVolume: '1498 cc',
    enginePower: '150 hp',
    drivetrain: 'Önden Çekiş',
    damageStatus: 'Hatasız, Boyasız',
    expertReport: 'https://example.com/report1.pdf',
    color: 'Siyah',
    warranty: '2 Yıl Garantili',
    image: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1542282088-fe8426682b8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    description: 'Ekspertiz garantili, yetkili servis bakımlı tramersiz Audi A3 Sportback. Hata, boya ve değişen yoktur.',
    isFeatured: true,
    isDamageFree: true,
    availability: 'Satışta',
    badge: 'FIRSAT'
  },
  {
    id: 2002,
    category: 'SALE',
    brand: 'Renault',
    model: 'Megane',
    series: '1.3 TCe Icon',
    year: 2021,
    type: 'Sedan',
    transmission: 'Otomatik',
    fuel: 'Benzin',
    price: 1350000,
    km: 68000,
    engineVolume: '1332 cc',
    enginePower: '140 hp',
    drivetrain: 'Önden Çekiş',
    damageStatus: '1 Parça Lokal Boyalı',
    expertReport: 'https://example.com/report2.pdf',
    color: 'Siyah',
    warranty: 'Garantisi Bitti',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1563720223185-11003d516935?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    description: 'En dolu paket Icon donanımıyla muazzam siyah renkli Megane. İç kondisyonu sıfır ayarında.',
    isFeatured: true,
    isDamageFree: false,
    availability: 'Satışta'
  },
  {
    id: 2003,
    category: 'SALE',
    brand: 'Peugeot',
    model: '3008',
    series: '1.5 BlueHDi Allure',
    year: 2020,
    type: 'SUV',
    transmission: 'Otomatik',
    fuel: 'Dizel',
    price: 1850000,
    km: 85000,
    engineVolume: '1499 cc',
    enginePower: '130 hp',
    drivetrain: 'Önden Çekiş',
    damageStatus: 'Değişensiz, Hatasız',
    expertReport: 'https://example.com/report3.pdf',
    color: 'Beyaz',
    warranty: 'Garantisi Bitti',
    image: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    description: 'Ailenizle güvenle binebileceğiniz, efsane tasarımı ve gelişmiş kokpiti ile Peugeot 3008.',
    isFeatured: true,
    isDamageFree: true,
    availability: 'Satışta',
    badge: 'POPÜLER'
  },
  {
    id: 2004,
    category: 'SALE',
    brand: 'Toyota',
    model: 'Hilux',
    series: '2.4 D-4D Invincible',
    year: 2023,
    type: 'Pickup',
    transmission: 'Otomatik',
    fuel: 'Dizel',
    price: 2450000,
    km: 15000,
    engineVolume: '2393 cc',
    enginePower: '150 hp',
    drivetrain: '4x4',
    damageStatus: 'Hatasız, Boyasız',
    expertReport: 'https://example.com/report-hilux.pdf',
    color: 'Siyah',
    warranty: 'Garantisi Devam Ediyor',
    image: 'https://images.unsplash.com/photo-1626262444655-b441a1eb7ce6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1626262444655-b441a1eb7ce6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1626262444655-b441a1eb7ce6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    description: 'Off-road donanımlı, sıfır ayarında, yenilmez Toyota Hilux. Yüksekova ve Hakkari coğrafyasına tam uyumlu.',
    isFeatured: true,
    isDamageFree: true,
    availability: 'Satışta',
    badge: 'YENİ'
  },

  // --- TURLAR (TOUR) ---
  {
    id: 3001,
    category: 'TOUR',
    title: 'Cilo Dağları & Buzullar Uzman Turu',
    description: 'Türkiye\'nin en yüksek kalıcı buzullarına ev sahipliği yapan Cilo Dağları\'nda eşsiz bir macera. 4 mevsimi aynı anda yaşayacağınız bu turda Ters Laleler, sarp zirveler ve buzul gölleri eşliğinde vahşi doğanın kalbine iniyoruz.',
    price: 4500,
    duration: 'Günübirlik Tur',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Günübirlik Profesyonel Tur', 'Bölgesel Lüks Öğle Yemeği', 'Tarihi Kiliseler', 'Buzul Alanlarına Özel Yürüyüş', 'Profesyonel Dağ Rehberliği'],
    mapIframeUrl: 'https://maps.google.com/maps?q=Cilo+Da%C4%9Flar%C4%B1+Buzullar%C4%B1&t=k&z=11&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3002,
    category: 'TOUR',
    title: 'Sat Gölleri Lüks Kamp Macerası',
    description: 'Hakkari\'nin parlayan incisi İkiyaka Dağlarındaki Sat Gölleri\'nde, yıldızların altında, hiçbir detaydan ödün vermeyen glamping tarzı lüks bir kamp deneyimi. Ateş başında yöresel masallar ve eşsiz manzara.',
    price: 8000,
    duration: '2 Gün 1 Gece',
    image: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Lüks Çadır & Tam Teçhizat', 'Ateş Başı Canlı Müzik', 'Organik Tüm Öğünler', 'Teleskopla Yıldız Gözlemi', 'Sabah Yoga Seansı'],
    mapIframeUrl: 'https://maps.google.com/maps?q=Sat+G%C3%B6lleri+Hakkari&t=k&z=12&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3003,
    category: 'TOUR',
    title: 'Şemdinli Vadisi Doğa & Kültür Turu',
    description: 'Şemdinli\'nin yemyeşil vadilerinde, Nehri Köyü, Kelat Sarayı ve Taş Köprüleri kapsayan otantik bir zaman yolculuğu. Seyhun Şelalesi etrafında yerel lezzet tadımları.',
    price: 3500,
    duration: 'Günübirlik Tur',
    image: 'https://images.unsplash.com/photo-1506744626753-1fa7604ed229?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Nehri Taş Köprüleri', 'Seyhun Şelalesi', 'Otlu Peynir Tadımı', 'Köy Evi Ziyareti', 'VIP Transfer'],
    mapIframeUrl: 'https://maps.google.com/maps?q=%C5%9Eemdinli+Hakkari&t=&z=11&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3004,
    category: 'TOUR',
    title: 'Zap Suyu Adrenalin & Rafting Turu',
    description: 'Türkiye\'nin en hırçın sularından Zap Nehri\'nde adrenalin dolu bir rafting deneyimi. Uzman yönlendiriciler eşliğinde güvenli, profesyonel ekipmanlarla suyun gücüne meydan okuyun.',
    price: 5000,
    duration: 'Günübirlik Tur',
    image: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Profesyonel Rafting Eğitimi', 'Tam Güvenlik Ekipmanı', 'Aksiyon Kamera Çekimi', 'Zap Dinlenme Tesisinde Yemek', 'Sertifika Verimi'],
    mapIframeUrl: 'https://maps.google.com/maps?q=Zap+Suyu+Hakkari&t=&z=12&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3005,
    category: 'TOUR',
    title: 'Çukurca Sınırları & Taş Evler Turu',
    description: 'Tarihi Çukurca taş evlerini, asırlık su değirmenlerini ve susam tahini üretim atölyelerini keşfedin. Irak sınırının sıfır noktasında benzersiz bir tarih ve coğrafya harmanı.',
    price: 3000,
    duration: 'Günübirlik Tur',
    image: 'https://images.unsplash.com/photo-1621213032731-bf50720fb9c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Tarihi Çukurca Evleri', 'Tahin Atölyesi Ziyareti', 'Yöresel Çay Saati', 'Sınır Vadisi Seyri', 'Rehber Desteği'],
    mapIframeUrl: 'https://maps.google.com/maps?q=%C3%87ukurca+Hakkari&t=k&z=13&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3006,
    category: 'TOUR',
    title: 'Yüksekova Yayla & Ters Lale Fotoğraf Safarisi',
    description: 'Yediveren, Sümbül, Cilo üçgeninde baharın müjdecisi Ters Laleleri (Ağlayan Gelin) tam mevsiminde fotoğraflamak için özel olarak düzenlenen safari tarzı fotoğraf turumuz.',
    price: 4000,
    duration: 'Günübirlik Tur',
    image: 'https://images.unsplash.com/photo-1517502474415-3df53b1b6015?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Ters Lale Alanları', 'Profesyonel Fotoğraf Rehberliği', 'Bahar Kahvaltısı', '4x4 VIP Safari Araçları', 'Yüksekova (Gever) Ovası Rotası'],
    mapIframeUrl: 'https://maps.google.com/maps?q=Y%C3%BCksekova+Hakkari&t=k&z=11&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3007,
    category: 'TOUR',
    title: 'Sümbül Dağı Panoramik 4x4 Zirve Turu',
    description: 'Hakkari merkezinin koruyucusu konumundaki Sümbül Dağı\'nın yamaçlarına VIP 4x4 Defender araçlarımızla çıkıyor, 3400 rakımdan tüm Mezopotamya\'ya yukarıdan bakıyoruz.',
    price: 5500,
    duration: 'Yarım Gün Tur',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['VIP 4x4 Offroad', 'Sümbül Şelalesi', 'Dağ Zirvesinde Barbekü', 'Seyir Dürbünü Kullanımı', 'Unutulmaz Manzaralar'],
    mapIframeUrl: 'https://maps.google.com/maps?q=S%C3%BCmb%C3%BCl+Da%C4%9F%C4%B1+Hakkari&t=p&z=12&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3008,
    category: 'TOUR',
    title: 'Berçelan Yaylası Geleneksel Yaşam Turu',
    description: 'Yaz aylarında göçerlerin şenlendirdiği Berçelan Yaylası\'na konuk oluyoruz. Geleneksel kıl çadırlarda koyun sağımından peynir yapımına yöresel kültürü ilk elden tecrübe edin.',
    price: 3200,
    duration: 'Günübirlik Tur',
    image: 'https://images.unsplash.com/photo-1518331613945-8fbe0dff8f79?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Kıl Çadır Deneyimi', 'Yayık Ayranı & Peynir Yapımı', 'Ata Binme Etkinliği', 'Doğa Yürüyüşü', 'Canlı Dengbej Dinletisi'],
    mapIframeUrl: 'https://maps.google.com/maps?q=Ber%C3%A7elan+Yaylas%C4%B1+Hakkari&t=p&z=13&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3009,
    category: 'TOUR',
    title: 'Hakkari Merkez Kültür & Tarih Yürüyüşü',
    description: 'Hakkari şehir merkezinin bilinmeyenleri. Meydan Medresesi, Mir Kalesi (Colemêrg Kalesi) ve Emir Şaban Camii gibi bin yıllık eserlerin gölgesinde tarih dolu bir yürüyüş.',
    price: 2000,
    duration: 'Yarım Gün Tur',
    image: 'https://images.unsplash.com/photo-1579603378564-99881dcca474?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Meydan Medresesi Ziyareti', 'Deneyimli Arkeolog Rehber', 'Şehir Müzeleri', 'Yerel Kilim Atölyesi', 'Sokak Lezzetleri'],
    mapIframeUrl: 'https://maps.google.com/maps?q=Hakkari+Merkez&t=&z=14&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3010,
    category: 'TOUR',
    title: 'Zeynel Bey Medresesi & Sınır Boyları Moto-Turu',
    description: 'Özellikle kendi motosikletleriyle gezen veya bizden lüks arazi aracı kiralayan misafirlerimiz için sınır boylarında yer alan tarihi mekanlara korumalı, rehberli premium rota gezisi.',
    price: 5200,
    duration: 'Günübirlik Tur',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Zeynel Bey Medresesi', 'Sınır Boyu Eşsiz Rotası', 'Action Cam Çekimleri', 'Korumalı İleri Sürüş', 'Dış Mekan Kahvesi'],
    mapIframeUrl: 'https://maps.google.com/maps?q=Hakkari+Zeynel+Bey+Medresesi&t=&z=12&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3011,
    category: 'TOUR',
    title: 'Oremar (Dağlıca) Vadisi & Avaşin Keşfi',
    description: 'Hakkari\'nin el değmemiş coğrafyalarında, sarp doruklarla çevrili Avaşin nehrinin oluşturduğu Oremar Vadisi\'ni keşfe çıkıyoruz. Otantik köyler, şelaleler ve derin kanyonlar.',
    price: 4800,
    duration: 'Günübirlik Tur',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Avaşin Kanyonu', 'Dağlıca Şelaleleri', 'Yöresel Köy Kahvaltısı', 'Özel Fotoğraf Safarisi', 'Rehberli Yürüyüş'],
    mapIframeUrl: 'https://maps.google.com/maps?q=Da%C4%9Fl%C4%B1ca+Hakkari&t=k&z=12&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3012,
    category: 'TOUR',
    title: 'Yeşiltaş Köyü Ekolojik Doğa Kampı',
    description: 'Yeşiltaş köyünde misafirperver yöre halkıyla iç içe, doğayla baş başa ekolojik bir köy ve kamp deneyimi. Geleneksel tarım, arıcılık ve taş evlerde konaklama opsiyonlu çadır kampı.',
    price: 6800,
    duration: '2 Gün 1 Gece',
    image: 'https://images.unsplash.com/photo-1508873696983-2dfd5898f08b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Köy Evinde Akşam Yemeği', 'Arıcılık & Bal Hasadı', 'Vadi İçi Doğa Yürüyüşü', 'Kamp Ateşi Etkinlikleri', 'Ekolojik Yaşam Pratikleri'],
    mapIframeUrl: 'https://maps.google.com/maps?q=Ye%C5%9Filta%C5%9F+K%C3%B6y%C3%BC+Hakkari&t=p&z=13&ie=UTF8&iwloc=&output=embed'
  },
  {
    id: 3013,
    category: 'TOUR',
    title: 'Cennet-Cehennem Vadisi Adrenalin Turu',
    description: 'Cilo Buzul Dağları silsilesinde yer alan ve bir tarafı yemyeşil "Cennet", diğer tarafı sarp kayalıklardan inen "Cehennem" olarak adlandırılan vadide destansı bir trekkiing rotası.',
    price: 4200,
    duration: 'Günübirlik Tur',
    image: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    highlights: ['Profesyonel Trekking', 'Buzul Şelaleleri', 'Kaya Tırmanışı Temelleri', 'Vahşi Yaşam Gözlemi', 'Kumanya ve Çay Molası'],
    mapIframeUrl: 'https://maps.google.com/maps?q=Cennet+Cehennem+Vadisi+Hakkari&t=k&z=12&ie=UTF8&iwloc=&output=embed'
  }
];

export const fallbackBlogPosts: BlogPost[] = [
  {
    id: 1,
    title: 'Hakkari ve Yöresinde Mutlaka Görmeniz Gereken 5 Gizli Rota',
    summary: 'Sıradan turist rotalarının dışına çıkarak Yüksekova ve Şemdinli arasındaki saklı vadileri keşfedin. Doğanın kalbine yolculuk başlasın.',
    content: '<p>Cilo Dağları buzullarından Sat Göllerine, doğa ile iç içe unutulmaz bir deneyim için işte size muhteşem rotalar. Hakkari bölge coğrafyasının zorlu yapısı, en el değmemiş doğal güzellikleri barındırıyor. Özel araç kiralama veya turlarımızla bu noktalara güvenle ulaşabilirsiniz.</p><p>1. Cilo Buzulları Kamp Alanı: Türkiye\'nin en büyük vadi buzullarına ev sahipliği yapan bu bölge, doğa severler için adeta bir cennet. Dört mevsim farklı güzellikler sunan bölgede özellikle ilkbahar aylarında eriyen karların oluşturduğu şelaleler büyüleyicidir.</p><p>2. Şemdinli Seyir Terası: İlçe merkezine tepeden bakan bu nokta eşsiz fotoğraflar çekmek için idealdir.</p>',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '10 Nisan 2026',
    readTime: '4 Dk Okuma'
  },
  {
    id: 2,
    title: 'Araç Kiralarken Dikkat Edilmesi Gereken 10 Altın Kural',
    summary: 'Kusursuz bir araç kiralama deneyimi mi yaşamak istiyorsunuz? Gizli maliyetlerden ve sözleşme tuzaklarından nasıl kaçınabileceğinizi öğrenin.',
    content: '<p>Araç kiralarken sözleşme detayları, kasko kapsamı, yakıt politikası ve kilometre sınırı gibi konular büyük önem taşır. Sözleşmeyi imzalamadan önce aracın her tarafının fotoğraflarını çekmek veya videoya almak iyi bir tedbirdir. Tüm kiralık araçlarımızda sunduğumuz şeffaf sözleşme politikası sayesinde kötü sürprizlerle karşılaşmazsınız.</p><p>Ayrıca aracın lastik durumunu, farlarını ve klima performansını kontrol etmeyi unutmayın. Kurumsal bir araç kiralama şirketinden kiralama yaptığınızda 7/24 yol yardım desteğinin de poliçenize dahil olacağından emin olabilirsiniz.</p>',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '15 Mart 2026',
    readTime: '6 Dk Okuma'
  },
  {
    id: 3,
    title: 'Şoförlü Araç Kiralama: Özel Günlerinizin Kahramanı',
    summary: 'Düğün, nişan veya VIP misafir karşılamalarında neden şoförlü kiralama tercih edilmeli?',
    content: '<p>En özel anlarınızda ulaşım stresi yaşamak istemezsiniz. Şoförlü VIP kiralama ile tüm yolculuğunuz boyunca arkanıza yaslanıp keyfini çıkarabilirsiniz.</p><p>Profesyonel şoförlerimiz bölgenin trafiğine ve alternatif güzergahlarına hakimdir. Özellikle iş seyahatlerinde, yolculuk esnasında dinlenmek veya toplantı notlarınızı gözden geçirmek için size değerli bir zaman dilimi kazandırır.</p>',
    image: 'https://images.unsplash.com/photo-1549558548-e87f17424ad3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '02 Şubat 2026',
    readTime: '3 Dk Okuma'
  },
  {
    id: 4,
    title: 'Kış Aylarında Güvenli Sürüş İçin Pratik Bilgiler',
    summary: 'Karlı ve buzlu yollarda direksiyon hakimiyetini nasıl korursunuz? Araç kiralamada kış donanımlarının önemi.',
    content: '<p>Kış sürüşü ekstra dikkat gerektirir. Lastiklerin, sileceklerin ve antifrizin durumu hayati önem taşır. Alperler Auto olarak tüm kışlık bakımları tamamlanmış araçlarımızla size güvenli bir sürüş deneyimi sunuyoruz.</p><p>Karlı yokuşları inerken motor frenini kullanmak, fren pedalına aniden basmaktan daha etkilidir. Kayma anında direksiyonu aracın kaydığı yöne doğru çok hafif çevirerek hakimiyeti tekrar sağlayabilirsiniz.</p>',
    image: 'https://images.unsplash.com/photo-1506192131238-d6f76c12ba30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '12 Ocak 2026',
    readTime: '5 Dk Okuma'
  },
  {
    id: 5,
    title: 'SUV vs. Sedan: Araç Kiralarken Hangisini Seçmelisiniz?',
    summary: 'Ailenizle tatile çıkarken veya zorlu arazi koşullarına sahip rotalara giderken doğru araç kategorisini nasıl belirlersiniz?',
    content: '<p>SUV araçlar yüksek oturuş pozisyonu, geniş bagaj hacmi ve zorlu yol şartlarına uyum sağlamaları ile öne çıkarken; Sedan araçlar otoyol sürüşlerinde konfor ve ekonomi sunar. Rotanıza ve yolcu sayısına göre doğru aracı seçmek seyahatinizi güzelleştirir.</p><p>Yüksekova\'nın dağlık ve eğimli yolları için SUV modellerimiz genellikle ilk tercih edilendir. Hem görüş açınızın geniş olması hem de süspansiyon sistemlerinin zorlu zeminleri daha iyi absorbe etmesi sayesinde mükemmel bir konfor yakalarsınız.</p>',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '04 Aralık 2025',
    readTime: '5 Dk Okuma'
  },
  {
    id: 6,
    title: 'Bölgedeki En İyi Kahvaltı Mekanları',
    summary: 'Kiralık aracınızla hafta sonu kaçamağı yaparken sabahın erken saatlerinde uğramanız gereken lezzet durakları.',
    content: '<p>Yörenin muhteşem doğal kahvaltılıklarıyla güne başlamak gibisi yoktur. Özellikle dağ eteklerindeki rustik restoranlar, hem manzaraları hem de organik menüleri ile göz dolduruyor.</p><p>Bal, kaymak, otlu peynir ve taze sıcak lavaş... Alperler Auto misafirlerine özel sunduğumuz rotalarla bu lezzetleri kolaylıkla keşfedebilirsiniz.</p>',
    image: 'https://images.unsplash.com/photo-1525648199074-bee30ba3d027?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '20 Kasım 2025',
    readTime: '4 Dk Okuma'
  },
  {
    id: 7,
    title: 'Kilometre Tasarrufu: Yakıt Verimli Sürüş Teknikleri',
    summary: 'Uzun yolda yakıttan tasarruf etmenizi sağlayacak, bütçe dostu pratik sürüş önerileri.',
    content: '<p>Ekonomik sürüş için vites değişim aralıkları, doğru lastik basıncı ve sabit hız çok önemlidir. Kiralık araçlarımız en son nesil verimli motor seçeneklerine sahiptir, ancak sizin sürüş alışkanlıklarınız da yakıt tüketimini doğrudan etkiler.</p><p>Gereksiz ağırlıklardan kurtulmak, klima kullanımını optimize etmek ve yüksek motor devirlerinden kaçınmak size uzun yolda ciddi bir avantaj sağlar.</p>',
    image: 'https://images.unsplash.com/photo-1542382025-a6e53d5e3cf7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '11 Ekim 2025',
    readTime: '4 Dk Okuma'
  },
  {
    id: 8,
    title: 'Araç Bakımında Orijinal Parçanın Önemi',
    summary: 'Her kiralık aracımızın neden yalnızca yetkili servislerde ve orijinal parçalarla bakımdan geçtiğini açıklıyoruz.',
    content: '<p>Müşterilerimizin güvenliği her şeyden önce gelir. Bu nedenle filomuzdaki tüm araçların periyodik bakımları zamanında, orijinal yedek parçalar kullanılarak yapılır.</p><p>Fren sistemlerinden motor aksamına kadar her şeyin eksiksiz ve yetkili standartlarında çalışması, sürüş esnasında yaşanabilecek riskleri en aza indirir.</p>',
    image: 'https://images.unsplash.com/photo-1486495146582-9ffcd8cb7bb2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '02 Eylül 2025',
    readTime: '3 Dk Okuma'
  },
  {
    id: 9,
    title: 'Havalimanı Transfer Avantajları',
    summary: 'Uçuştan indiğiniz anda sizi bekleyen lüks veya ekonomik bir transferin seyahat konforunuza katacağı değer.',
    content: '<p>Taksi kuyrukları veya otobüs saatleri ile vakit kaybetmek yerine, havalimanından kapınıza kadar VIP araçlarla ulaşım sağlamak en mantıklı seçenektir.</p><p>Uçuş detaylarınızı sistemimize girdiğinizde şoförlerimiz rötar durumunda bile sizi zamanında karşılamak üzere hazır bekler.</p>',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '15 Ağustos 2025',
    readTime: '3 Dk Okuma'
  },
  {
    id: 10,
    title: 'Yeni Başlayanlar İçin Kamp Rotaları',
    summary: 'Doğayla iç içe ilk kamp deneyiminiz için uygun alanlar ve kiralayabileceğiniz arazi araçları rehberi.',
    content: '<p>Şehirden uzaklaşıp doğaya dönmek isteyenler için bölgedeki en güvenli kamp rotalarını derledik. Arazi araçlarımız ve pick-up seçeneklerimiz, kamp ekipmanlarınızı yanınızda taşımanız için oldukça elverişlidir.</p><p>Kamp ateşi etrafında yıldızları izlerken aracınızın güven veren donanımı her zaman yanı başınızda olacak.</p>',
    image: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '28 Temmuz 2025',
    readTime: '5 Dk Okuma'
  },
  {
    id: 11,
    title: 'Dizel mi Benzinli mi? Yeni Nesil Hibrit Modeller',
    summary: 'Hangi yakıt tipi sizin rotanız için daha avantajlı? Hibrit teknolojisinin araç kiralamasındaki yeri.',
    content: '<p>Dizel motorlar tork güçleri ile yokuş tırmanışlarında avantaj sağlarken benzinli motorlar genellikle daha sessiz bir sürüş vadeder. Artık hibrit modellerimizle düşük yakıt tüketimi ve çevre dostu seyahatler sunuyoruz.</p><p>Kiralama tercihinizde hem bütçenizi hem de çevre faktörlerini göz önünde bulundurmanız için tüm detayları uzman asistanlarımızdan danışabilirsiniz.</p>',
    image: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '10 Haziran 2025',
    readTime: '4 Dk Okuma'
  },
  {
    id: 12,
    title: 'Seyehatlerinizde Müzik ve Eğlence Sistemleri',
    summary: 'Uzun yolların sıkıcılığını unutturacak araç içi multimedya donanımları hakkında bilmeniz gerekenler.',
    content: '<p>Apple CarPlay ve Android Auto destekli multimedya sistemler sayesinde tüm kiralık araçlarımızda müzik dinlemek ve harita yönetimi çok pratik.</p><p>Telefonunuzu araca bağlayıp favori çalma listenizi dinlerken yüksek ses kalitesinin tadını çıkarın.</p>',
    image: 'https://images.unsplash.com/photo-1534062369680-e883838ae62d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '02 Mayıs 2025',
    readTime: '3 Dk Okuma'
  },
  {
    id: 13,
    title: 'Tarihi Mekanlar: Şemdinli Taş Köprü ve Çevresi',
    summary: 'Kültürel bir tur yapmak isteyenler için bölgenin önemli tarihi dokuları ve oraya giden güzergahlar.',
    content: '<p>Dağların arasında adeta bir zaman yolculuğu yaşatan taş köprüler, tarih meraklıları için keşfedilmesi gereken eşsiz duraklardandır. Kiralık bir araçla bu noktalara yapacağınız bir ziyaret hem konforlu hem de hafızalara kazınacak bir deneyim sunar.</p><p>Fotoğraf makinenizi yanınıza almayı unutmayın!</p>',
    image: 'https://images.unsplash.com/photo-1600572703816-778f69eb56ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '16 Nisan 2025',
    readTime: '4 Dk Okuma'
  },
  {
    id: 14,
    title: 'Araç İçi Klima Kullanım Optimizasyonu',
    summary: 'Yaz aylarında bunalmadan, aracı yormadan klima sistemini en verimli şekilde kullanmanın taktikleri.',
    content: '<p>Klimayı aracı ilk çalıştırdığınız anında değil, pencereleri açarak sıcak havayı bir miktar tahliye ettikten sonra açmak daha sağlıklıdır. Böylece kompresör zorlanmaz.</p><p>Tüm kiralık araçlarımızın klima gazları ve polen filtreleri yaz/kış sezon geçişlerinde eksiksiz olarak yenilenir.</p>',
    image: 'https://images.unsplash.com/photo-1563821013753-15be96f863ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '05 Nisan 2025',
    readTime: '3 Dk Okuma'
  },
  {
    id: 15,
    title: 'Alperler Auto Araç Havuzu Sistemine Katılmanın Avantajları',
    summary: 'Garajınızda yatan aracınızı bizimle değerlendirerek düzenli ek gelir elde edebileceğinizi biliyor muydunuz?',
    content: '<p>Aracınız kapıda boş yatıyorsa veya iş nedeniyle kullanamıyorsanız, Alperler Auto’nun profesyonel havuz sistemine aracınızı dahil edebilirsiniz.</p><p>Aracınızın kaskosu, periyodik bakımı ve tüm güvenlik süreçleri tarafımızdan takip edilir. Hem aracınız değerinden bir şey kaybetmeden özenle korunur, hem de sizin için risksiz bir gelir kapısı oluşur.</p>',
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    date: '20 Mart 2025',
    readTime: '5 Dk Okuma'
  }
];

export const fallbackFaqs: FaqItem[] = [
  {
    id: 1,
    question: 'Araç kiralama şartları nelerdir?',
    answer: 'Araç kiralayabilmek için en az 1 yıllık geçerli B sınıfı ehliyet sahibi olmanız ve 21 yaşını doldurmuş olmanız gerekmektedir. Üst segment araçlarımız için bu şartlar 3 yıl ehliyet ve 25 yaş olarak değişiklik göstermektedir.'
  },
  {
    id: 2,
    question: 'Araç kiralamada depozito (provizyon) alınıyor mu?',
    answer: 'Evet, kiraladığınız araç grubuna göre kredi kartınızdan provizyon çekilmektedir (1500 TL - 5000 TL arası). Araç sorunsuz iade edildiğinde bu tutar doğrudan kartınıza iade edilir.'
  },
  {
    id: 3,
    question: 'Günlük kilometre sınırı var mıdır?',
    answer: 'Kiralık araçlarımızda standart günlük kilometre sınırı 250 KM\'dir. Aylık kiralamalarda ise 3500 KM veya 4000 KM sınırları uygulanabilmektedir. Ek kilometreler sözleşme sırasında karşılıklı belirlenen düşük ücretler üzerinden hesaplanır.'
  },
  {
    id: 4,
    question: 'Araçlarınıza kasko dâhil mi, hangi durumlarda kasko bozulur?',
    answer: 'Tüm araçlarımız Rent A Car kapsamlı muafiyetli kaskoludur. Karışılan kazalarda tutanak tutulması zorunludur. Alkol veya uyuşturucu etkisi altında yapılan kazalar kasko kapsamı dışındadır.'
  },
  {
    id: 5,
    question: 'Havalimanı veya otogar teslimatı yapıyor musunuz?',
    answer: 'Elbette. Yüksekova Selahaddin Eyyubi Havalimanı, Van Ferit Melen Havalimanı ve Şırnak Şerafettin Elçi Havalimanı başta olmak üzere, bölgedeki otogar ve belirli adreslere 7/24 Vale ile araç teslimat hizmetimiz bulunmaktadır.'
  },
  {
    id: 6,
    question: 'İkinci el satılık araçlarınızda ekspertiz ve garanti mevcut mu?',
    answer: 'Kesinlikle. Portföyümüzde bulunan tüm ikinci el araçlar TSE onaylı, tam kapsamlı ve detaylı kurumsal ekspertiz raporlarına sahiptir. Ayrıca firmamız aracılığıyla alınan araçlara belirli sürelerde mekanik garanti sağlanabilmektedir.'
  },
  {
    id: 7,
    question: 'Tur organizasyonlarınıza neler dâhildir?',
    answer: 'Yüksekova, Hakkari, Şemdinli, Kars ve Erzurum bölgelerine düzenlediğimiz turlarımızda; lüks ulaşım, profesyonel kokartlı rehberlik, belirtilen öğünler (kahvaltı vs.) ve sigorta paketi fiyata dâhildir.'
  }
];
