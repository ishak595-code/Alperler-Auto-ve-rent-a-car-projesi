import { Vehicle } from '../models/car.model';
import { BlogPost, FaqItem } from './car.service';

/**
 * Server-authoritative catalogue policy.
 *
 * Rental vehicles, sale vehicles, tours, blog posts and FAQs are loaded from
 * the live Supabase catalogue. Keeping historical browser/static snapshots in
 * the application bundle allowed old records to reappear before or during a
 * cloud refresh and made new admin changes look inconsistent.
 *
 * These arrays intentionally remain empty. They are kept only as typed startup
 * defaults so consumers do not need nullable state while the live catalogue is
 * loading. Do not add production catalogue records here.
 */
export const fallbackInventory: Vehicle[] = [];
export const fallbackBlogPosts: BlogPost[] = [];
export const fallbackFaqs: FaqItem[] = [];
