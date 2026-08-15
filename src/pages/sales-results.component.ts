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
    .filter-control{min-height:46px;width:100%;border-radius:.75rem;border:1px solid #cbd5e1;background:#f8fafc;padding:.55rem .7rem;font-size:.8rem;font-weight:800;color:#0f172a;outline:none}.filter-control:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.2)}
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

  clearAll(): void {
    this.searchQuery.set("");this.filterBrand.set("");this.filterPrice.set("");this.filterYear.set("");this.filterKm.set("");this.filterColor.set("");this.filterDamage.set("");this.filterFuel.set("");this.filterTransmission.set("");this.filterType.set("");this.filterWarranty.set("");this.sortBy.set("default");
  }

  goBack(): void { if (typeof window !== "undefined" && window.history.length > 1) this.location.back(); else void this.router.navigate(["/"]); }

  private matchesRange(value:number, range:string):boolean { if(!range) return true; if(range.endsWith("+")) return value>=Number(range.slice(0,-1)); const [min,max]=range.split("-").map(Number); return value>=min&&value<=max; }
  private matchesDamage(car:Vehicle, damage:string):boolean { if(!damage) return true; const text=(car.damageStatus||"").toLocaleLowerCase("tr-TR"); const clean=car.isDamageFree===true||text.includes("hasarsız")||text.includes("hatasız"); return damage==="clean"?clean:!clean; }
}
