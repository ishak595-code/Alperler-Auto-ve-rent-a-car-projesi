import fs from 'node:fs';

const file='src/pages/booking-checkout.component.ts';
let source=fs.readFileSync(file,'utf8');
function replace(from,to,label){if(!source.includes(from))throw new Error(`missing ${label}`);source=source.replace(from,to);}
replace('readonly today=new Date().toISOString().slice(0,10);','readonly today=this.localDateString(new Date());','local today');
replace('private selectedPeriodAvailable():boolean{','selectedPeriodAvailable():boolean{','template availability visibility');
replace('else if(detail.includes("INVALID_RENTAL_VEHICLE"))this.errorMessage.set("Araç kaydı doğrulanamadı. Araç sayfasına dönüp tekrar deneyin.");','else if(detail.includes("INVALID_RENTAL_VEHICLE"))this.errorMessage.set("Araç kaydı doğrulanamadı. Araç sayfasına dönüp tekrar deneyin.");else if(detail.includes("INVALID_PICKUP_BRANCH"))this.errorMessage.set("Seçtiğiniz teslim alma noktası şu anda kiralama teslimine açık değil. Lütfen başka bir teslim noktası seçin.");else if(detail.includes("INVALID_DROPOFF_BRANCH"))this.errorMessage.set("Seçtiğiniz iade noktası şu anda araç iadesine açık değil. Lütfen başka bir iade noktası seçin.");else if(detail.includes("INVALID_BRANCH_TIMEZONE"))this.errorMessage.set("Şube saat dilimi doğrulanamadı. Lütfen başka bir teslim noktası seçin veya ekiple iletişime geçin.");','branch error UX');
fs.writeFileSync(file,source);
console.log('V163.2 CI repair applied');
