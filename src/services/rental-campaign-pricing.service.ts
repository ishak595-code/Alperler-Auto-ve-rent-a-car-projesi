import { Injectable, inject } from '@angular/core';
import { Params } from '@angular/router';
import { RentalDuration } from '../models/booking.model';
import { Car } from '../models/car.model';
import { CampaignRecord } from './campaign.service';
import { CarService } from './car.service';

export interface RentalDisplayContext {
  duration: RentalDuration;
  quantity: number;
  rentalDays?: number;
  rentalHours?: number;
  selectedExtraIds: string[];
}

export interface RentalCampaignDisplayQuote {
  eligible: boolean;
  reason?: string;
  campaignId: string;
  normalSubtotal: number;
  requiredExtrasTotal: number;
  discount: number;
  finalTotal: number;
  unitPrice: number;
  quantity: number;
  requiredExtraIds: string[];
}

@Injectable({ providedIn: 'root' })
export class RentalCampaignPricingService {
  private readonly cars = inject(CarService);

  contextFromParams(params: Params | null | undefined): RentalDisplayContext {
    const duration = this.asDuration(params?.['duration']);
    const selectedExtraIds = this.requiredSelectedExtras(params);
    if (duration === 'hourly') {
      const start = this.minutes(String(params?.['startTime'] || ''));
      const end = this.minutes(String(params?.['endTime'] || ''));
      const hours = start !== null && end !== null && end > start ? Math.max(1, Math.min(23, Math.ceil((end - start) / 60))) : 1;
      return { duration, quantity: hours, rentalHours: hours, selectedExtraIds };
    }
    const days = this.days(String(params?.['start'] || ''), String(params?.['end'] || '')) || 1;
    return { duration, quantity: days, rentalDays: days, selectedExtraIds };
  }

  quote(car: Car, campaign: CampaignRecord | null | undefined, context: RentalDisplayContext): RentalCampaignDisplayQuote | null {
    if (!campaign || !this.targetMatches(car, campaign) || !campaign.isActive || campaign.publicationStatus !== 'PUBLISHED') return null;
    const now = Date.now();
    if (campaign.startsAt && new Date(campaign.startsAt).getTime() > now) return null;
    if (campaign.endsAt && new Date(campaign.endsAt).getTime() <= now) return null;

    const quantity = Math.max(1, context.quantity || 1);
    const canonicalUnit = context.duration === 'hourly' ? Number(car.hourlyPrice || 0) : Number(car.price || 0);
    if (canonicalUnit <= 0) return null;
    const normalSubtotal = this.money(canonicalUnit * quantity);
    const requiredExtraIds = this.requiredExtraIds(campaign);
    const requiredExtrasTotal = this.requiredExtrasTotal(requiredExtraIds, context.duration, quantity);

    let reason = '';
    if (normalSubtotal < Number(campaign.minimumOrderAmount || 0)) reason = 'minimum_order';
    if (!reason && campaign.minimumRentalDays && Number(context.rentalDays || 0) < campaign.minimumRentalDays) reason = 'minimum_days';
    if (!reason && campaign.minimumRentalHours && Number(context.rentalHours || 0) < campaign.minimumRentalHours) reason = 'minimum_hours';
    if (!reason && requiredExtraIds.some((id) => !context.selectedExtraIds.includes(id))) reason = 'required_extras';

    const discount = reason ? 0 : this.discountAmount(normalSubtotal, quantity, campaign);
    const commercialSubtotal = this.money(Math.max(0, normalSubtotal - discount));
    const finalTotal = this.money(commercialSubtotal + requiredExtrasTotal);
    return {
      eligible: !reason,
      reason: reason || undefined,
      campaignId: campaign.id,
      normalSubtotal,
      requiredExtrasTotal,
      discount,
      finalTotal,
      unitPrice: this.money(finalTotal / quantity),
      quantity,
      requiredExtraIds,
    };
  }

  requiredExtraIds(campaign: CampaignRecord | null | undefined): string[] {
    const raw = campaign?.metadata?.['requiredExtraIds'];
    if (!Array.isArray(raw)) return [];
    return Array.from(new Set(raw.map((value) => String(value || '').trim()).filter((value) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value)))).slice(0, 20);
  }

  requiredExtrasLabel(campaign: CampaignRecord | null | undefined): string {
    const ids = this.requiredExtraIds(campaign);
    if (!ids.length) return '';
    const config = this.cars.getConfig()();
    const labels = ids.map((id) => config.rentalExtras?.find((row) => row.id === id)?.label || id);
    return labels.join(', ');
  }

  conditionLabel(campaign: CampaignRecord, context?: RentalDisplayContext): string {
    const parts: string[] = [];
    if (campaign.minimumRentalDays) parts.push(`en az ${campaign.minimumRentalDays} gün`);
    if (campaign.minimumRentalHours) parts.push(`en az ${campaign.minimumRentalHours} saat`);
    if (campaign.minimumOrderAmount > 0) parts.push(`en az ${this.money(campaign.minimumOrderAmount).toLocaleString('tr-TR')} TL`);
    const extras = this.requiredExtrasLabel(campaign);
    if (extras) parts.push(`${extras} zorunlu`);
    if (campaign.perCustomerLimit) parts.push(`müşteri başı ${campaign.perCustomerLimit} kullanım`);
    if (context && campaign.minimumRentalDays && (context.rentalDays || 0) < campaign.minimumRentalDays) parts.push('seçili süre kampanyaya uygun değil');
    return parts.join(' · ');
  }

  private requiredSelectedExtras(params: Params | null | undefined): string[] {
    const selected = new Set<string>();
    if (params?.['driverMode'] === 'with' || params?.['driver'] === 'true' || params?.['occasion'] === 'wedding') selected.add('driver');
    return [...selected];
  }

  private requiredExtrasTotal(ids: string[], duration: RentalDuration, quantity: number): number {
    if (!ids.length) return 0;
    const extras = this.cars.getConfig()().rentalExtras || [];
    return this.money(ids.reduce((sum, id) => {
      const extra = extras.find((row) => row.id === id && row.enabled !== false);
      if (!extra) return sum;
      const flat = Math.max(0, Number(extra.flatPrice || 0));
      if (duration === 'hourly') {
        const hourly = extra.pricePerHour == null ? Number(extra.pricePerDay || 0) / 8 : Number(extra.pricePerHour || 0);
        return sum + Math.max(0, hourly) * quantity + flat;
      }
      return sum + Math.max(0, Number(extra.pricePerDay || 0)) * quantity + flat;
    }, 0));
  }

  private discountAmount(normalSubtotal: number, quantity: number, campaign: CampaignRecord): number {
    const value = Math.max(0, Number(campaign.discountValue || 0));
    let discount = 0;
    if (campaign.discountMethod === 'PERCENT') {
      discount = normalSubtotal * Math.min(100, value) / 100;
    } else if (campaign.discountMethod === 'FIXED_PRICE') {
      discount = campaign.discountScope === 'ORDER'
        ? Math.max(0, normalSubtotal - value)
        : Math.max(0, normalSubtotal - value * quantity);
    } else {
      discount = campaign.discountScope === 'ORDER' ? value : value * quantity;
    }
    return this.money(Math.min(normalSubtotal, Math.max(0, discount)));
  }

  private targetMatches(car: Car, campaign: CampaignRecord): boolean {
    if (campaign.targetType !== 'VEHICLE' || !campaign.targetId) return false;
    const target = String(campaign.targetId).toLowerCase();
    return [car.id, car.cloudId, car.cloudStockCode].some((value) => value != null && String(value).toLowerCase() === target);
  }

  private asDuration(value: unknown): RentalDuration {
    return value === 'hourly' || value === 'weekly' || value === 'monthly' || value === 'longterm' ? value : 'daily';
  }

  private days(startValue: string, endValue: string): number {
    const start = this.date(startValue); const end = this.date(endValue);
    if (!start || !end || end <= start) return 0;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  }

  private date(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private minutes(value: string): number | null {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const hours = Number(match[1]); const minutes = Number(match[2]);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 ? hours * 60 + minutes : null;
  }

  private money(value: number): number { return Math.round((Number(value) || 0) * 100) / 100; }
}
