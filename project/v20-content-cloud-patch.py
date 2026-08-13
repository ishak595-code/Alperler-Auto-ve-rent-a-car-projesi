from pathlib import Path

path = Path('src/services/car.service.ts')
text = path.read_text(encoding='utf-8')

import_anchor = 'import { SiteConfig } from "../models/site-config.model";\n'
cloud_import = 'import { ContentCloudService, CloudBlogPost, CloudFaqItem } from "./content-cloud.service";\n'
if cloud_import not in text:
    if import_anchor not in text:
        raise SystemExit('SiteConfig import anchor missing')
    text = text.replace(import_anchor, import_anchor + cloud_import, 1)

http_anchor = 'export class CarService {\n  private http = inject(HttpClient);\n'
http_replacement = 'export class CarService {\n  private http = inject(HttpClient);\n  private contentCloud = inject(ContentCloudService);\n'
if 'private contentCloud = inject(ContentCloudService);' not in text:
    if http_anchor not in text:
        raise SystemExit('CarService injection anchor missing')
    text = text.replace(http_anchor, http_replacement, 1)

constructor_anchor = '    this.loadFromStorage();\n    this.listenForCloudVehicles();\n'
constructor_replacement = '    this.loadFromStorage();\n    this.listenForCloudVehicles();\n    this.listenForCloudContent();\n'
if 'this.listenForCloudContent();' not in text:
    if constructor_anchor not in text:
        raise SystemExit('Constructor cloud listener anchor missing')
    text = text.replace(constructor_anchor, constructor_replacement, 1)

vehicle_listener_anchor = '  private listenForCloudVehicles() {\n'
content_listener = '''  private listenForCloudContent() {\n    this.contentCloud.watchSiteConfig((config) => {\n      this._config.set({ ...this._config(), ...config });\n    });\n\n    this.contentCloud.watchTours((items) => {\n      this._tours.set(items);\n    });\n\n    this.contentCloud.watchBlogPosts((items) => {\n      this._blogPosts.set(items as BlogPost[]);\n    });\n\n    this.contentCloud.watchFaqs((items) => {\n      this._faqs.set(items as FaqItem[]);\n    });\n  }\n\n'''
if 'private listenForCloudContent()' not in text:
    if vehicle_listener_anchor not in text:
        raise SystemExit('Vehicle listener anchor missing')
    text = text.replace(vehicle_listener_anchor, content_listener + vehicle_listener_anchor, 1)

public_methods_anchor = '  // --- PUBLIC METHODS ---\n\n  resetStats() {\n'
public_methods_replacement = '''  // --- PUBLIC METHODS ---\n\n  async ensureContentCloud(): Promise<void> {\n    await this.contentCloud.seedMissingContent(\n      this._config(),\n      this._tours(),\n      this._blogPosts() as CloudBlogPost[],\n      this._faqs() as CloudFaqItem[],\n    );\n  }\n\n  resetStats() {\n'''
if 'async ensureContentCloud()' not in text:
    if public_methods_anchor not in text:
        raise SystemExit('Public methods anchor missing')
    text = text.replace(public_methods_anchor, public_methods_replacement, 1)

old_faq = '''  addFaq(faq: FaqItem) {\n    this._faqs.update((f) => {\n      if (faq.id && f.find((x) => x.id === faq.id)) {\n        return f.map((x) => (x.id === faq.id ? faq : x));\n      } else {\n        return [{ ...faq, id: Date.now() }, ...f];\n      }\n    });\n  }\n  deleteFaq(id: number) {\n    this._faqs.update((f) => f.filter((x) => x.id !== id));\n  }\n'''
new_faq = '''  addFaq(faq: FaqItem) {\n    const exists = Boolean(faq.id && this._faqs().some((item) => item.id === faq.id));\n    const savedFaq: FaqItem = { ...faq, id: exists ? faq.id : Date.now() };\n    this._faqs.update((items) =>\n      exists\n        ? items.map((item) => (item.id === savedFaq.id ? savedFaq : item))\n        : [savedFaq, ...items],\n    );\n    void this.contentCloud.saveFaq(savedFaq as CloudFaqItem).catch((error) =>\n      console.error("FAQ cloud save failed", error),\n    );\n  }\n  deleteFaq(id: number) {\n    this._faqs.update((items) => items.filter((item) => item.id !== id));\n    void this.contentCloud.deleteFaq(id).catch((error) =>\n      console.error("FAQ cloud delete failed", error),\n    );\n  }\n'''
if old_faq in text:
    text = text.replace(old_faq, new_faq, 1)
elif 'FAQ cloud save failed' not in text:
    raise SystemExit('FAQ block not found')

old_tour = '''  addTour(tour: Tour) {\n    this._tours.update((t) => {\n      if (tour.id && t.find((x) => x.id === tour.id)) {\n        return t.map((x) => (x.id === tour.id ? tour : x));\n      } else {\n        return [{ ...tour, id: Date.now() }, ...t];\n      }\n    });\n  }\n  deleteTour(id: number) {\n    this._tours.update((t) => t.filter((x) => x.id !== id));\n  }\n'''
new_tour = '''  addTour(tour: Tour) {\n    const exists = Boolean(tour.id && this._tours().some((item) => item.id === tour.id));\n    const savedTour: Tour = { ...tour, id: exists ? tour.id : Date.now() };\n    this._tours.update((items) =>\n      exists\n        ? items.map((item) => (item.id === savedTour.id ? savedTour : item))\n        : [savedTour, ...items],\n    );\n    void this.contentCloud.saveTour(savedTour).catch((error) =>\n      console.error("Tour cloud save failed", error),\n    );\n  }\n  deleteTour(id: number) {\n    this._tours.update((items) => items.filter((item) => item.id !== id));\n    void this.contentCloud.deleteTour(id).catch((error) =>\n      console.error("Tour cloud delete failed", error),\n    );\n  }\n'''
if old_tour in text:
    text = text.replace(old_tour, new_tour, 1)
elif 'Tour cloud save failed' not in text:
    raise SystemExit('Tour block not found')

old_config = '''  updateConfig(newConfig: SiteConfig) {\n    this._config.set(newConfig);\n  }\n'''
new_config = '''  updateConfig(newConfig: SiteConfig) {\n    this._config.set(newConfig);\n    void this.contentCloud.saveSiteConfig(newConfig).catch((error) =>\n      console.error("Site config cloud save failed", error),\n    );\n  }\n'''
if old_config in text:
    text = text.replace(old_config, new_config, 1)
elif 'Site config cloud save failed' not in text:
    raise SystemExit('Config block not found')

old_blog = '''  addBlogPost(post: BlogPost) {\n    this._blogPosts.update((posts) => {\n      if (post.id && posts.find((p) => p.id === post.id)) {\n        return posts.map((p) => (p.id === post.id ? post : p));\n      } else {\n        return [{ ...post, id: Date.now() }, ...posts];\n      }\n    });\n  }\n  deleteBlogPost(id: number) {\n    this._blogPosts.update((posts) => posts.filter((p) => p.id !== id));\n  }\n'''
new_blog = '''  addBlogPost(post: BlogPost) {\n    const exists = Boolean(post.id && this._blogPosts().some((item) => item.id === post.id));\n    const savedPost: BlogPost = { ...post, id: exists ? post.id : Date.now() };\n    this._blogPosts.update((items) =>\n      exists\n        ? items.map((item) => (item.id === savedPost.id ? savedPost : item))\n        : [savedPost, ...items],\n    );\n    void this.contentCloud.saveBlogPost(savedPost as CloudBlogPost).catch((error) =>\n      console.error("Blog cloud save failed", error),\n    );\n  }\n  deleteBlogPost(id: number) {\n    this._blogPosts.update((items) => items.filter((item) => item.id !== id));\n    void this.contentCloud.deleteBlogPost(id).catch((error) =>\n      console.error("Blog cloud delete failed", error),\n    );\n  }\n'''
if old_blog in text:
    text = text.replace(old_blog, new_blog, 1)
elif 'Blog cloud save failed' not in text:
    raise SystemExit('Blog block not found')

path.write_text(text, encoding='utf-8')

# Ensure admin session seeds existing local content into Firestore once.
dash = Path('src/pages/admin/admin-dashboard.component.ts')
dash_text = dash.read_text(encoding='utf-8')
if 'OnInit' not in dash_text.split('\n', 1)[0] and "from '@angular/core'" in dash_text:
    dash_text = dash_text.replace(
        "import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';",
        "import { Component, inject, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';",
        1,
    )
if 'export class AdminDashboardComponent implements OnInit' not in dash_text:
    dash_text = dash_text.replace(
        'export class AdminDashboardComponent {',
        'export class AdminDashboardComponent implements OnInit {',
        1,
    )
if 'async ngOnInit()' not in dash_text:
    anchor = '  carService = inject(CarService);\n'
    addition = '''  carService = inject(CarService);\n\n  async ngOnInit() {\n    try {\n      await this.carService.ensureVehicleCloudInventory();\n      await this.carService.ensureContentCloud();\n    } catch (error) {\n      console.error("Admin cloud bootstrap failed", error);\n      this.toastService.show("Bulut verileri hazırlanamadı. Firebase yetkilerini kontrol edin.", "error");\n    }\n  }\n'''
    if anchor not in dash_text:
        raise SystemExit('Dashboard service anchor missing')
    dash_text = dash_text.replace(anchor, addition, 1)
dash.write_text(dash_text, encoding='utf-8')
