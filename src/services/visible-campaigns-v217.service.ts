import { Injectable } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CampaignRecord } from './campaign.service';

@Injectable({providedIn:'root'})
export class VisibleCampaignsV217Service {
  async forVehicleIds(ids:string[],signal?:AbortSignal):Promise<Map<string,CampaignRecord>>{
    const clean=[...new Set(ids.map(String).map(v=>v.trim()).filter(v=>/^[0-9a-f-]{36}$/i.test(v)))].slice(0,48);
    if(!clean.length)return new Map();
    const params=new URLSearchParams({select:'*',target_type:'eq.VEHICLE',visibility_mode:'eq.EVERYWHERE',target_id:`in.(${clean.join(',')})`,order:'priority.asc,sort_order.asc,id.asc',limit:'96'});
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/public_campaign_catalog_v217?${params}`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,accept:'application/json'},cache:'no-store',signal});
    if(!response.ok)return new Map();
    const rows=await response.json() as any[];const result=new Map<string,CampaignRecord>();
    for(const row of rows){const target=String(row.target_id||'');if(!target||result.has(target))continue;result.set(target,this.map(row));}
    return result;
  }
  private map(row:any):CampaignRecord{return{id:String(row.id),title:String(row.title||''),slug:String(row.slug||''),shortDescription:String(row.short_description||'')||undefined,description:String(row.description||'')||undefined,badge:String(row.badge||'')||undefined,campaignType:(row.campaign_type||'CUSTOM') as CampaignRecord['campaignType'],coverImage:String(row.cover_image||'')||undefined,oldPrice:this.optional(row.old_price),newPrice:this.optional(row.new_price),discountPercent:this.optional(row.discount_percent),discountMethod:(row.discount_method||'FIXED_AMOUNT') as CampaignRecord['discountMethod'],discountValue:this.num(row.discount_value),discountScope:(row.discount_scope||'UNIT') as CampaignRecord['discountScope'],visibilityMode:(row.visibility_mode||'EVERYWHERE') as CampaignRecord['visibilityMode'],minimumOrderAmount:this.num(row.minimum_order_amount),minimumRentalDays:this.optional(row.minimum_rental_days),minimumRentalHours:this.optional(row.minimum_rental_hours),maxRedemptions:this.optional(row.max_redemptions),perCustomerLimit:this.num(row.per_customer_limit)||1,allowReferralDiscount:row.allow_referral_discount!==false,allowLoyaltyRedemption:row.allow_loyalty_redemption!==false,priority:this.num(row.priority),targetType:row.target_type||undefined,targetId:row.target_id||undefined,ctaLabel:String(row.cta_label||'Fırsatı İncele'),ctaUrl:String(row.cta_url||'')||undefined,whatsappMessage:String(row.whatsapp_message||'')||undefined,startsAt:row.starts_at||undefined,endsAt:row.ends_at||undefined,publicationStatus:(row.publication_status||'PUBLISHED') as CampaignRecord['publicationStatus'],isActive:row.is_active!==false,sortOrder:this.num(row.sort_order),metadata:row.metadata&&typeof row.metadata==='object'?row.metadata:{}};}
  private num(v:unknown){const n=Number(v);return Number.isFinite(n)?n:0;}private optional(v:unknown){if(v===null||v===undefined||v==='')return undefined;const n=Number(v);return Number.isFinite(n)?n:undefined;}
}
