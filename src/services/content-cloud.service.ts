import { Injectable } from "@angular/core";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { Tour } from "../models/car.model";
import { SiteConfig } from "../models/site-config.model";

export interface CloudBlogPost {
  id: number;
  title: string;
  summary: string;
  content: string;
  image: string;
  readTime: string;
  date: string;
}

export interface CloudFaqItem {
  id: number;
  question: string;
  answer: string;
  isOpen?: boolean;
}

@Injectable({ providedIn: "root" })
export class ContentCloudService {
  private sanitize<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  watchSiteConfig(onValue: (config: SiteConfig) => void): () => void {
    return onSnapshot(
      doc(db, "site_config", "main"),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data() as Record<string, unknown>;
        const { updatedAt: _updatedAt, ...config } = data;
        onValue(config as unknown as SiteConfig);
      },
      (error) => console.warn("Site config cloud listener unavailable", error),
    );
  }

  watchTours(onValue: (items: Tour[]) => void): () => void {
    return onSnapshot(
      collection(db, "tours"),
      (snapshot) => {
        if (snapshot.empty) return;
        const items = snapshot.docs.map((item) => {
          const data = item.data() as Record<string, unknown>;
          const { updatedAt: _updatedAt, ...tour } = data;
          const numericId = Number(item.id);
          return {
            ...tour,
            id: Number.isNaN(numericId) ? item.id : numericId,
          } as Tour;
        });
        onValue(items);
      },
      (error) => console.warn("Tours cloud listener unavailable", error),
    );
  }

  watchBlogPosts(onValue: (items: CloudBlogPost[]) => void): () => void {
    return onSnapshot(
      collection(db, "blog_posts"),
      (snapshot) => {
        if (snapshot.empty) return;
        const items = snapshot.docs.map((item) => {
          const data = item.data() as Record<string, unknown>;
          const { updatedAt: _updatedAt, ...post } = data;
          return { ...post, id: Number(item.id) } as unknown as CloudBlogPost;
        });
        onValue(items.sort((a, b) => b.id - a.id));
      },
      (error) => console.warn("Blog cloud listener unavailable", error),
    );
  }

  watchFaqs(onValue: (items: CloudFaqItem[]) => void): () => void {
    return onSnapshot(
      collection(db, "faqs"),
      (snapshot) => {
        if (snapshot.empty) return;
        const items = snapshot.docs.map((item) => {
          const data = item.data() as Record<string, unknown>;
          const { updatedAt: _updatedAt, ...faq } = data;
          return { ...faq, id: Number(item.id) } as unknown as CloudFaqItem;
        });
        onValue(items.sort((a, b) => a.id - b.id));
      },
      (error) => console.warn("FAQ cloud listener unavailable", error),
    );
  }

  async saveSiteConfig(config: SiteConfig): Promise<void> {
    await setDoc(doc(db, "site_config", "main"), {
      ...this.sanitize(config),
      updatedAt: serverTimestamp(),
    });
  }

  async saveTour(tour: Tour): Promise<void> {
    await setDoc(doc(db, "tours", String(tour.id)), {
      ...this.sanitize(tour),
      updatedAt: serverTimestamp(),
    });
  }

  async deleteTour(id: number | string): Promise<void> {
    await deleteDoc(doc(db, "tours", String(id)));
  }

  async saveBlogPost(post: CloudBlogPost): Promise<void> {
    await setDoc(doc(db, "blog_posts", String(post.id)), {
      ...this.sanitize(post),
      updatedAt: serverTimestamp(),
    });
  }

  async deleteBlogPost(id: number | string): Promise<void> {
    await deleteDoc(doc(db, "blog_posts", String(id)));
  }

  async saveFaq(faq: CloudFaqItem): Promise<void> {
    await setDoc(doc(db, "faqs", String(faq.id)), {
      ...this.sanitize(faq),
      updatedAt: serverTimestamp(),
    });
  }

  async deleteFaq(id: number | string): Promise<void> {
    await deleteDoc(doc(db, "faqs", String(id)));
  }

  async seedMissingContent(
    config: SiteConfig,
    tours: Tour[],
    blogPosts: CloudBlogPost[],
    faqs: CloudFaqItem[],
  ): Promise<void> {
    const configSnapshot = await getDoc(doc(db, "site_config", "main"));
    if (!configSnapshot.exists()) await this.saveSiteConfig(config);

    const toursSnapshot = await getDocs(collection(db, "tours"));
    if (toursSnapshot.empty && tours.length > 0) {
      await Promise.all(tours.map((tour) => this.saveTour(tour)));
    }

    const blogSnapshot = await getDocs(collection(db, "blog_posts"));
    if (blogSnapshot.empty && blogPosts.length > 0) {
      await Promise.all(blogPosts.map((post) => this.saveBlogPost(post)));
    }

    const faqSnapshot = await getDocs(collection(db, "faqs"));
    if (faqSnapshot.empty && faqs.length > 0) {
      await Promise.all(faqs.map((faq) => this.saveFaq(faq)));
    }
  }
}
