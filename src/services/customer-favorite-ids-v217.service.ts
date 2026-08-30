import { Injectable } from '@angular/core';
@Injectable({providedIn:'root'})
export class CustomerFavoriteIdsV217Service {
  private readonly key='db_favoriteCars';
  ids():string[]{if(typeof localStorage==='undefined')return[];try{const parsed=JSON.parse(localStorage.getItem(this.key)||'[]');return Array.isArray(parsed)?[...new Set(parsed.map(v=>String(v??'').trim()).filter(Boolean))]:[];}catch{return[];}}
  page(page:number,pageSize:number){const ids=this.ids();const start=Math.max(0,Math.floor(page))*Math.max(1,pageSize);return{ids:ids.slice(start,start+pageSize),hasMore:start+pageSize<ids.length,total:ids.length};}
}
