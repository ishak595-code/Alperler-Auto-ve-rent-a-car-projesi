import { SUPABASE_PROJECT_URL, supabaseRestHeaders } from "./_lib/supabase-public";

type Kind = "ALL" | "RENTAL" | "SALE" | "TOUR";

type BranchRow = {
  id:string;slug?:string|null;name:string;operator_display_name?:string|null;operator_relationship?:string|null;
  platform_disclaimer?:string|null;city?:string|null;district?:string|null;province_code?:string|null;district_code?:string|null;
  address_line?:string|null;phone?:string|null;whatsapp?:string|null;email?:string|null;hero_image?:string|null;
  customer_guarantee_enabled?:boolean|null;
};

function clean(value:unknown,max:number):string{return typeof value==="string"?value.trim().slice(0,max):"";}
function json(body:unknown,status=200):Response{return Response.json(body,{status,headers:{"cache-control":"no-store","content-type":"application/json; charset=utf-8","x-content-type-options":"nosniff"}});}
async function rest(path:string):Promise<Response>{return fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`,{headers:supabaseRestHeaders(),signal:AbortSignal.timeout(10_000)});}
function branchPublic(row:BranchRow){return{id:row.id,slug:row.slug||undefined,name:row.name,operatorName:row.operator_display_name||row.name,operatorRelationship:row.operator_relationship||"INDEPENDENT_PARTNER",platformDisclaimer:row.platform_disclaimer||"İlan ve araç operasyonu belirtilen şube veya işletme tarafından yürütülür. Alperler Auto platform ve rezervasyon altyapısı sağlar. Tüketicinin kanuni hakları saklıdır.",city:row.city||"",district:row.district||"",provinceCode:row.province_code||"",districtCode:row.district_code||"",address:row.address_line||undefined,phone:row.phone||undefined,whatsapp:row.whatsapp||undefined,email:row.email||undefined,heroImage:row.hero_image||undefined,customerGuaranteeEnabled:row.customer_guarantee_enabled!==false};}
function vehiclePublic(row:any,branch:BranchRow){const category=row.category==="SALE"?"SALE":"RENTAL";const images=Array.isArray(row.images)?row.images:[];return{id:row.metadata?.legacyId??row.id,cloudId:row.id,stockCode:row.stock_code,category,brand:row.brand||"",model:row.model||"",year:row.model_year??undefined,price:Number(category==="RENTAL"?(row.rental_price_daily??row.price??0):(row.price??0)),currency:row.currency||"TRY",km:row.mileage_km??undefined,fuel:row.fuel_type||undefined,transmission:row.transmission||undefined,type:row.body_type||undefined,color:row.color||undefined,seats:row.seats??undefined,description:row.description||"",features:Array.isArray(row.features)?row.features:[],image:row.cover_image||images[0]||undefined,images,isFeatured:Boolean(row.is_featured),availabilityStatus:row.availability_status,branch:branchPublic(branch),operatorName:branch.operator_display_name||branch.name,city:branch.city||"",district:branch.district||"",provinceCode:branch.province_code||"",districtCode:branch.district_code||"",platformRole:"MARKETPLACE_AND_RESERVATION_INFRASTRUCTURE"};}
function tourPublic(row:any,branch:BranchRow){const images=Array.isArray(row.images)?row.images:[];return{id:row.metadata?.legacyId??row.id,cloudId:row.id,slug:row.seo_slug,title:row.title||"",description:row.description||row.short_description||"",price:Number(row.price_per_person||0),currency:row.currency||"TRY",duration:row.duration||undefined,meetingPoint:row.meeting_point||undefined,capacity:row.capacity??undefined,image:row.cover_image||images[0]||undefined,images,isFeatured:Boolean(row.is_featured),branch:branchPublic(branch),operatorName:branch.operator_display_name||branch.name,city:branch.city||"",district:branch.district||"",provinceCode:branch.province_code||"",districtCode:branch.district_code||"",platformRole:"MARKETPLACE_AND_RESERVATION_INFRASTRUCTURE"};}

export default async function handler(request:Request):Promise<Response>{
  if(request.method!=="GET")return json({ok:false,code:"METHOD_NOT_ALLOWED"},405);
  const url=new URL(request.url);
  const province=clean(url.searchParams.get("province"),16).toUpperCase();
  const district=clean(url.searchParams.get("district"),20).toUpperCase();
  const kind=(clean(url.searchParams.get("kind"),12).toUpperCase()||"ALL") as Kind;
  if(province&&!/^TUR\d{3}$/.test(province))return json({ok:false,code:"INVALID_PROVINCE"},400);
  if(district&&!/^TUR\d{6}$/.test(district))return json({ok:false,code:"INVALID_DISTRICT"},400);
  if(district&&!province)return json({ok:false,code:"PROVINCE_REQUIRED_FOR_DISTRICT"},400);
  if(!new Set<Kind>(["ALL","RENTAL","SALE","TOUR"]).has(kind))return json({ok:false,code:"INVALID_KIND"},400);

  try{
    const branchResponse=await rest("branches?is_active=eq.true&public_status=eq.ACTIVE&select=id,slug,name,operator_display_name,operator_relationship,platform_disclaimer,city,district,province_code,district_code,address_line,phone,whatsapp,email,hero_image,customer_guarantee_enabled&order=sort_order.asc,name.asc");
    if(!branchResponse.ok)throw new Error("BRANCH_SOURCE_UNAVAILABLE");
    const allBranches=await branchResponse.json() as BranchRow[];
    const branches=allBranches.filter(branch=>(!province||branch.province_code===province)&&(!district||branch.district_code===district));
    if(!branches.length)return json({ok:true,province,district,kind,branches:[],records:[],counts:{branches:0,rentals:0,sales:0,tours:0}});
    const byId=new Map(branches.map(branch=>[branch.id,branch]));
    const ids=branches.map(branch=>branch.id).join(",");
    const records:any[]=[];
    let rentals=0,sales=0,tours=0;

    if(kind==="ALL"||kind==="RENTAL"||kind==="SALE"){
      const category=kind==="RENTAL"?"&category=eq.RENTAL":kind==="SALE"?"&category=eq.SALE":"";
      const vehicleResponse=await rest(`vehicles?is_active=eq.true&branch_id=in.(${ids})${category}&select=*&order=is_featured.desc,updated_at.desc`);
      if(!vehicleResponse.ok)throw new Error("VEHICLE_SOURCE_UNAVAILABLE");
      const rows=await vehicleResponse.json() as any[];
      for(const row of rows){const branch=byId.get(String(row.branch_id));if(!branch)continue;const item=vehiclePublic(row,branch);records.push(item);if(row.category==="SALE")sales+=1;else rentals+=1;}
    }

    if(kind==="ALL"||kind==="TOUR"){
      const tourResponse=await rest(`tours?is_active=eq.true&branch_id=in.(${ids})&select=*&order=is_featured.desc,updated_at.desc`);
      if(!tourResponse.ok)throw new Error("TOUR_SOURCE_UNAVAILABLE");
      const rows=await tourResponse.json() as any[];
      for(const row of rows){const branch=byId.get(String(row.branch_id));if(!branch)continue;records.push(tourPublic(row,branch));tours+=1;}
    }

    return json({ok:true,province,district,kind,branches:branches.map(branchPublic),records,counts:{branches:branches.length,rentals,sales,tours}});
  }catch(error){return json({ok:false,code:error instanceof Error?error.message:"BRANCH_MARKETPLACE_UNAVAILABLE"},503);}
}
