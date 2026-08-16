import { CommonModule, Location } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import { VehicleListItemComponent } from "../components/vehicle-list-item.component";
import { Vehicle } from "../models/car.model";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-sales-results",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, VehicleListItemComponent],
  templateUrl: "./sales-results.component.html",
  styles: [`
    .count-badge{display:grid;min-width:20px;height:20px;place-items:center;border-radius:999px;background:#2563eb;padding:0 5px;font-size:10px}.filter-backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-end;justify-content:center;background:rgba(2,6,23,.72);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.filter-sheet{display:flex;width:100%;max-height:min(88vh,780px);flex-direction:column;border:1px solid #dbe3ee;border-radius:24px 24px 0 0;background:#fff;color:#0f172a;box-shadow:0 -24px 70px rgba(2,6,23,.32)}.filter-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid #e2e8f0;padding:1rem 1.1rem}.filter-head p{margin:0;color:#2563eb;font-size:10px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.filter-head h2{margin:2px 0 0;font-size:1.2rem;font-weight:950}.filter-head button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:13px;background:#f1f5f9;color:#334155}.filter-scroll{overflow:auto;padding:1rem}.filter-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.filter-grid label{display:flex;min-width:0;flex-direction:column;gap:.35rem}.filter-grid label>span{color:#475569;font-size:10px;font-weight:950;letter-spacing:.055em;text-transform:uppercase}.filter-control{min-height:48px;width:100%;border-radius:12px;border:1px solid #cbd5e1;background:#f8fafc;padding:.6rem .72rem;font-size:.8rem;font-weight:800;color:#0f172a;outline:none}.filter-control:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.14);background:#fff}.filter-footer{display:grid;grid-template-columns:.9fr 1.1fr;gap:.65rem;border-top:1px solid #e2e8f0;background:#fff;padding:.85rem 1rem max(.85rem,env(safe-area-inset-bottom))}.filter-footer button{min-height:50px;border-radius:13px;font-size:.76rem;font-weight:950}.filter-footer .secondary{border:1px solid #cbd5e1;background:#fff;color:#334155}.filter-footer .primary{border:0;background:#0f172a;color:#fff}@media(min-width:768px){.filter-backdrop{align-items:center;padding:2rem}.filter-sheet{max-width:820px;border-radius:24px}.filter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:420px){.filter-grid{grid-template-columns:1fr}}
  `],
})
export class SalesResultsComponent {
  private readonly carService = inject(CarService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly saleCars = this.carService.getSaleCars();
  readonly searchQuery = signal("");
  readonly filterBrand = signal("");
  readonly filterPrice = signal("");
  readonly filterYear = signal("");
  readonly filterKm = signal("");
  readonly filterColor = signal("");
  readonly filterDamage = signal("");
  readonly filterFuel = signal("");
  readonly filterTransmission = signal("");
  readonly filterType = signal("");
  readonly filterWarranty = signal("");
  readonly sortBy = signal("default");
  readonly filterOpen = signal(false);

  readonly priceOptions = [
    { id: "", label: "Tüm fiyatlar" },
    { id: "0-500000", label: "0 - 500.000 TL" },
    { id: "500000-1000000", label: "500.000 - 1.000.000 TL" },
    { id: "1000000-2000000", label: "1.000.000 - 2.000.000 TL" },
    { id: "2000000+", label: "2.000.000+ TL" },
  ];
  readonly kmOptions = [
    { id: "", label: "Tüm kilometreler" },
    { id: "0-50000", label: "0 - 50.000 km" },
    { id: "50000-100000", label: "50.000 - 100.000 km" },
    { id: "100000-150000", label: "100.000 - 150.000 km" },
    { id: "150000+", label: "150.000+ km" },
  ];
  readonly damageOptions = [
    { id: "", label: "Tüm hasar durumları" },
    { id: "clean", label: "Hasarsız" },
    { id: "damaged", label: "Hasar kayıtlı" },
  ];
  readonly sortOptions = [
    { id: "default", label: "Önerilen sıra" },
    { id: "priceAsc", label: "Fiyat artan" },
    { id: "priceDesc", label: "Fiyat azalan" },
    { id: "yearDesc", label: "En yeni model" },
    { id: "kmAsc", label: "En düşük kilometre" },
  ];

  readonly brands = computed(() => Array.from(new Set(this.saleCars().map((car) => car.brand).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b,"tr")));
  readonly years = computed(() => Array.from(new Set(this.saleCars().map((car) => car.year).filter((year): year is number => typeof year === "number"))).sort((a,b) => b-a));
  readonly colors = computed(() => Array.from(new Set(this.saleCars().map((car) => car.color).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b,"tr")));
  readonly fuels = computed(() => Array.from(new Set(this.saleCars().map((car) => car.fuel).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b,"tr")));
  readonly transmissions = computed(() => Array.from(new Set(this.saleCars().map((car) => car.transmission).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b,"tr")));
  readonly types = computed(() => Array.from(new Set(this.saleCars().map((car) => car.type).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b,"tr")));
  readonly activeFilterCount = computed(() => [this.filterBrand(),this.filterPrice(),this.filterYear(),this.filterKm(),this.filterColor(),this.filterDamage(),this.filterFuel(),this.filterTransmission(),this.filterType(),this.filterWarranty()].filter(Boolean).length);

  readonly filteredVehicles = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase("tr-TR");
    const result = this.saleCars().filter((car) => {
      if (query) {
        const haystack = [car.id,car.cloudStockCode,car.title,car.brand,car.model,car.series,car.year].filter((value) => value != null).join(" ").toLocaleLowerCase("tr-TR");
        if (!haystack.includes(query)) return false;
      }
      if (this.filterBrand() && car.brand !== this.filterBrand()) return false;
      if (this.filterYear() && String(car.year) !== this.filterYear()) return false;
      if (this.filterColor() && car.color !== this.filterColor()) return false;
      if (this.filterFuel() && car.fuel !== this.filterFuel()) return false;
      if (this.filterTransmission() && car.transmission !== this.filterTransmission()) return false;
      if (this.filterType() && car.type !== this.filterType()) return false;
      if (this.filterWarranty() === "yes" && !(car.hasWarranty || car.warranty)) return false;
      if (!this.matchesRange(car.price, this.filterPrice())) return false;
      if (!this.matchesRange(car.km || 0, this.filterKm())) return false;
      if (!this.matchesDamage(car, this.filterDamage())) return false;
      return true;
    });

    const sorted = [...result];
    if (this.sortBy() === "priceAsc") sorted.sort((a,b) => a.price-b.price);
    if (this.sortBy() === "priceDesc") sorted.sort((a,b) => b.price-a.price);
    if (this.sortBy() === "yearDesc") sorted.sort((a,b) => (b.year||0)-(a.year||0));
    if (this.sortBy() === "kmAsc") sorted.sort((a,b) => (a.km||0)-(b.km||0));
    return sorted;
  });

  constructor() {
    const initial = this.route.snapshot.queryParamMap.get("search")?.trim();
    if (initial) this.searchQuery.set(initial);
  }

  clearFilters(): void { this.filterBrand.set("");this.filterPrice.set("");this.filterYear.set("");this.filterKm.set("");this.filterColor.set("");this.filterDamage.set("");this.filterFuel.set("");this.filterTransmission.set("");this.filterType.set("");this.filterWarranty.set("");this.sortBy.set("default"); }
  clearAll(): void { this.searchQuery.set("");this.clearFilters(); }
  goBack(): void { if (typeof window !== "undefined" && window.history.length > 1) this.location.back(); else void this.router.navigate(["/"]); }

  private matchesRange(value:number, range:string):boolean { if(!range) return true; if(range.endsWith("+")) return value>=Number(range.slice(0,-1)); const [min,max]=range.split("-").map(Number); return value>=min&&value<=max; }
  private matchesDamage(car:Vehicle, damage:string):boolean { if(!damage) return true; const text=(car.damageStatus||"").toLocaleLowerCase("tr-TR"); const clean=car.isDamageFree===true||text.includes("hasarsız")||text.includes("hatasız"); return damage==="clean"?clean:!clean; }
}
