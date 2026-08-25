import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,value){fs.writeFileSync(path,value);}
function replaceOnce(source, from, to, label){
  if(!source.includes(from)) throw new Error(`V163 patch target missing: ${label}`);
  return source.replace(from,to);
}

// Public car detail must render technical facts from the live vehicle record,
// never from a brand/model lookup table compiled into the frontend.
{
  const path='src/pages/car-detail.component.ts';
  let s=read(path);
  s=replaceOnce(s,'import { getTechnicalSpecs } from "../data/technical-specs.data";\n','', 'car detail static spec import');
  s=replaceOnce(
    s,
    'readonly media=computed<GalleryMedia[]>(()=>{const car=this.vehicle();if(!car)return[];const failed=new Set(this.failedMedia());const seen=new Set<string>();const result:GalleryMedia[]=[];for(const url of this.detailData.mediaUrls(car)){if(!url||failed.has(url)||seen.has(url))continue;seen.add(url);result.push({type:"image",url});}for(const video of car.videos||[]){const url=this.detailData.mediaUrl(video.url);if(!url||failed.has(url)||seen.has(url))continue;seen.add(url);result.push({type:"video",url,posterUrl:this.detailData.mediaUrl(video.posterUrl),title:video.title});}return result.slice(0,30);});readonly activeMedia=computed(()=>{const list=this.media();return list.length?list[Math.min(this.currentSlide(),list.length-1)]:null;});readonly technicalSpecs=computed(()=>{const car=this.vehicle();if(!car)return null;const key=car.series?`${car.series} ${car.model||""}`.trim():car.model||"";return getTechnicalSpecs(car.brand||"",key)||getTechnicalSpecs(car.brand||"",car.model||"")||null;});',
    'readonly media=computed<GalleryMedia[]>(()=>{const car=this.vehicle();if(!car)return[];const failed=new Set(this.failedMedia());const seen=new Set<string>();const result:GalleryMedia[]=[];for(const url of this.detailData.mediaUrls(car)){if(!url||failed.has(url)||seen.has(url))continue;seen.add(url);result.push({type:"image",url});}for(const video of car.videos||[]){const url=this.detailData.mediaUrl(video.url);if(!url||failed.has(url)||seen.has(url))continue;seen.add(url);result.push({type:"video",url,posterUrl:this.detailData.mediaUrl(video.posterUrl),title:video.title});}return result.slice(0,30);});readonly activeMedia=computed(()=>{const list=this.media();return list.length?list[Math.min(this.currentSlide(),list.length-1)]:null;});readonly technicalSpecs=computed(()=>{const car=this.vehicle();if(!car)return null;if(car.technicalSpecs)return car.technicalSpecs;const specs={maxSpeed:String(car.maxSpeed||""),acceleration:String(car.acceleration||""),cityFuel:String(car.cityFuelConsumption||""),highwayFuel:String(car.highwayFuelConsumption||""),combinedFuel:String(car.fuelConsumption||""),tankCapacity:String(car.fuelTankCapacity||""),trunkCapacity:String(car.trunkVolume||""),wheels:String(car.wheelSize||""),dimensions:[car.length,car.width,car.height].filter(Boolean).join(" × "),cylinders:car.cylinderCount?`${car.cylinderCount} Silindir`:"",engineVolume:String(car.engineVolume||""),enginePower:String(car.enginePower||""),torque:String(car.torque||""),weight:String(car.weight||""),drivetrain:String(car.drivetrain||"")};return Object.values(specs).some(Boolean)?specs:null;});',
    'car detail dynamic technical specs',
  );
  write(path,s);
}

// Branch administrators explicitly own the IANA timezone configuration.
{
  const path='src/pages/admin/admin-branches.component.ts';
  let s=read(path);
  s=replaceOnce(
    s,
    '<label class="block"><span class="field-label">E-posta</span><input [(ngModel)]="draft.email" type="email" class="field" /></label>\n            <label class="block"><span class="field-label">Hizmet Bölgesi</span>',
    '<label class="block"><span class="field-label">E-posta</span><input [(ngModel)]="draft.email" type="email" class="field" /></label>\n            <label class="block"><span class="field-label">Saat Dilimi</span><input [(ngModel)]="draft.timezone" class="field" placeholder="Europe/Istanbul" aria-describedby="branch-timezone-help" /><small id="branch-timezone-help" class="mt-1 block text-xs text-slate-500">IANA saat dilimi kullanın. Türkiye için Europe/Istanbul.</small></label>\n            <label class="block"><span class="field-label">Hizmet Bölgesi</span>',
    'admin branch timezone field',
  );
  s=replaceOnce(
    s,
    'return { id: "", name: "", city: "Hakkari", district: "Yüksekova", addressLabel: "", phone: "", whatsapp: "", email: "", mapUrl: "",',
    'return { id: "", name: "", city: "Hakkari", district: "Yüksekova", addressLabel: "", phone: "", whatsapp: "", email: "", timezone: "Europe/Istanbul", mapUrl: "",',
    'admin branch timezone default',
  );
  write(path,s);
}

// Every technical value rendered publicly must also be editable in the admin
// catalogue and therefore persisted to the database-backed vehicle metadata.
{
  const path='src/pages/admin/admin-catalog-editor.component.ts';
  let s=read(path);
  s=replaceOnce(
    s,
    '<label class="field"><span>Yakıt tüketimi</span><input [ngModel]="meta(car,\'fuelConsumption\')" (ngModelChange)="setMeta(car,\'fuelConsumption\',$event)" name="fuelConsumption" /></label>\n                        <label class="field"><span>Bagaj hacmi</span>',
    '<label class="field"><span>Ortalama yakıt tüketimi</span><input [ngModel]="meta(car,\'fuelConsumption\')" (ngModelChange)="setMeta(car,\'fuelConsumption\',$event)" name="fuelConsumption" /></label>\n                        <label class="field"><span>Şehir içi tüketim</span><input [ngModel]="meta(car,\'cityFuelConsumption\')" (ngModelChange)="setMeta(car,\'cityFuelConsumption\',$event)" name="cityFuelConsumption" /></label>\n                        <label class="field"><span>Şehir dışı tüketim</span><input [ngModel]="meta(car,\'highwayFuelConsumption\')" (ngModelChange)="setMeta(car,\'highwayFuelConsumption\',$event)" name="highwayFuelConsumption" /></label>\n                        <label class="field"><span>Yakıt deposu</span><input [ngModel]="meta(car,\'fuelTankCapacity\')" (ngModelChange)="setMeta(car,\'fuelTankCapacity\',$event)" name="fuelTankCapacity" /></label>\n                        <label class="field"><span>Jant / lastik</span><input [ngModel]="meta(car,\'wheelSize\')" (ngModelChange)="setMeta(car,\'wheelSize\',$event)" name="wheelSize" /></label>\n                        <label class="field"><span>Ağırlık</span><input [ngModel]="meta(car,\'weight\')" (ngModelChange)="setMeta(car,\'weight\',$event)" name="weight" /></label>\n                        <label class="field"><span>Silindir sayısı</span><input [ngModel]="meta(car,\'cylinderCount\')" (ngModelChange)="setMetaNumber(car,\'cylinderCount\',$event)" name="cylinderCount" type="number" min="1" max="16" /></label>\n                        <label class="field"><span>Uzunluk</span><input [ngModel]="meta(car,\'length\')" (ngModelChange)="setMeta(car,\'length\',$event)" name="length" /></label>\n                        <label class="field"><span>Genişlik</span><input [ngModel]="meta(car,\'width\')" (ngModelChange)="setMeta(car,\'width\',$event)" name="width" /></label>\n                        <label class="field"><span>Yükseklik</span><input [ngModel]="meta(car,\'height\')" (ngModelChange)="setMeta(car,\'height\',$event)" name="height" /></label>\n                        <label class="field"><span>Bagaj hacmi</span>',
    'admin dynamic technical fields',
  );
  write(path,s);
}

// Keep install/build inputs reproducible. The lockfile already resolves 4.2.1.
for (const path of ['package.json','package-lock.json']) {
  let s=read(path);
  if(!s.includes('"tailwindcss": "latest"')) throw new Error(`V163 patch target missing: ${path} floating tailwind`);
  s=s.replace('"tailwindcss": "latest"','"tailwindcss": "4.2.1"');
  write(path,s);
}

console.log('V163 deterministic final hardening patch applied.');
