import fs from 'fs';
let content = fs.readFileSync('src/services/mock-data.ts', 'utf8');

// The FAQs
content = content.replace(/export const fallbackFaqs: FaqItem\[\] = \[([\s\S]*?)\];/, () => `export const fallbackFaqs: FaqItem[] = [
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
    answer: 'Kiralık araçlarımızda standart günlük kilometre sınırı 250 KM\\'dir. Aylık kiralamalarda ise 3500 KM veya 4000 KM sınırları uygulanabilmektedir. Ek kilometreler sözleşme sırasında karşılıklı belirlenen düşük ücretler üzerinden hesaplanır.'
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
];`);

fs.writeFileSync('src/services/mock-data.ts', content);
console.log('Fixed FAQs');
