import { CommonModule, Location } from "@angular/common";
import { Component, ElementRef, ViewChild, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute } from "@angular/router";
import { VehicleListItemComponent } from "../components/vehicle-list-item.component";
import { Vehicle } from "../models/car.model";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-sales-results",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, VehicleListItemComponent],
  templateUrl: "./sales-results.component.html",
  styles: [`
    dialog:not([open]){display:none}
    .filter-title{font-size:.75rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#475569}
    .filter-option{min-height:44px;border-radius:.75rem;background:#f8fafc;padding:.5rem .75rem;font-size:.8rem;font-weight:800;color:#334155;outline:none}
    .filter-option:focus-visible{box-shadow:0 0 0 2px #3b82f6}
    .filter-option.selected{background:#2563eb;color:white}
  `],
})
export class SalesResultsComponent {
  private readonly carService = inject(CarService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  @ViewChild("filterDialog") filterDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild("sortDialog") sortDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild("filterTrigger") filterTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild("sortTrigger") sortTrigger?: ElementRef<HTMLButtonElement>;

  readonly saleCars = this.carService.getSaleCars();
  readonly searchQuery = signal("");
  readonly filterBrand = signal("");
  readonly filterPrice = signal("");
  readonly filterYear = signal("");
  readonly filterKm = signal("");
  readonly filterColor = signal("");
  readonly filterDamage = signal("");
  readonly sortBy = signal("default");

  tempBrand = "";
  tempPrice = "";
  tempYear = "";
  tempKm = "";
  tempColor = "";
  tempDamage = "";

  readonly priceOptions = [
    { id: "", label: "Tümü" },
    { id: "0-500000", label: "0 - 500.000 TL" },
    { id: "500000-1000000", label: "500.000 - 1.000.000 TL" },
    { id: "1000000-2000000", label: "1.000.000 - 2.000.000 TL" },
    { id: "2000000+", label: "2.000.000+ TL" },
  ];
  readonly kmOptions = [
    { id: "", label: "Tümü" },
    { id: "0-50000", label: "0 - 50.000 km" },
    { id: "50000-100000", label: "50.000 - 100.000 km" },
    { id: "100000-150000", label: "100.000 - 150.000 km" },
    { id: "150000+", label: "150.000+ km" },
  ];
  readonly sortOptions = [
    { id: "default", label: "Varsayılan" },
    { id: "priceAsc", label: "Fiyat: Artan" },
    { id: "priceDesc", label: "Fiyat: Azalan" },
    { id: "yearDesc", label: "Model Yılı: Yeni" },
    { id: "yearAsc", label: "Model Yılı: Eski" },
  ];

  readonly brands = computed(() =>
    Array.from(new Set(this.saleCars().map((car) => car.brand).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "tr")),
  );
  readonly years = computed(() =>
    Array.from(new Set(this.saleCars().map((car) => car.year).filter((year): year is number => typeof year === "number"))).sort((a, b) => b - a),
  );
  readonly colors = computed(() =>
    Array.from(new Set(this.saleCars().map((car) => car.color).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "tr")),
  );
  readonly activeFilterCount = computed(() =>
    [this.filterBrand(), this.filterPrice(), this.filterYear(), this.filterKm(), this.filterColor(), this.filterDamage()].filter(Boolean).length,
  );

  readonly filteredVehicles = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase("tr-TR");
    const result = this.saleCars().filter((car) => {
      if (query) {
        const haystack = [car.id, car.title, car.brand, car.model, car.series, car.year]
          .filter((value) => value !== undefined && value !== null)
          .join(" ")
          .toLocaleLowerCase("tr-TR");
        if (!haystack.includes(query)) return false;
      }
      if (this.filterBrand() && car.brand !== this.filterBrand()) return false;
      if (this.filterYear() && String(car.year) !== this.filterYear()) return false;
      if (this.filterColor() && car.color !== this.filterColor()) return false;
      if (!this.matchesRange(car.price, this.filterPrice())) return false;
      if (!this.matchesRange(car.km || 0, this.filterKm())) return false;
      if (!this.matchesDamage(car, this.filterDamage())) return false;
      return true;
    });

    const sorted = [...result];
    if (this.sortBy() === "priceAsc") sorted.sort((a, b) => a.price - b.price);
    if (this.sortBy() === "priceDesc") sorted.sort((a, b) => b.price - a.price);
    if (this.sortBy() === "yearDesc") sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
    if (this.sortBy() === "yearAsc") sorted.sort((a, b) => (a.year || 0) - (b.year || 0));
    return sorted;
  });

  constructor() {
    const initial = this.route.snapshot.queryParamMap.get("search")?.trim();
    if (initial) this.searchQuery.set(initial);
  }

  openFilterDialog(): void {
    this.tempBrand = this.filterBrand();
    this.tempPrice = this.filterPrice();
    this.tempYear = this.filterYear();
    this.tempKm = this.filterKm();
    this.tempColor = this.filterColor();
    this.tempDamage = this.filterDamage();
    this.filterDialog?.nativeElement.showModal();
  }

  closeFilterDialog(): void { this.filterDialog?.nativeElement.close(); }
  restoreFilterFocus(): void { this.filterTrigger?.nativeElement.focus({ preventScroll: true }); }
  openSortDialog(): void { this.sortDialog?.nativeElement.showModal(); }
  closeSortDialog(): void { this.sortDialog?.nativeElement.close(); }
  restoreSortFocus(): void { this.sortTrigger?.nativeElement.focus({ preventScroll: true }); }

  applyFilters(): void {
    this.filterBrand.set(this.tempBrand);
    this.filterPrice.set(this.tempPrice);
    this.filterYear.set(this.tempYear);
    this.filterKm.set(this.tempKm);
    this.filterColor.set(this.tempColor);
    this.filterDamage.set(this.tempDamage);
    this.closeFilterDialog();
  }

  resetTemporaryFilters(): void {
    this.tempBrand = "";
    this.tempPrice = "";
    this.tempYear = "";
    this.tempKm = "";
    this.tempColor = "";
    this.tempDamage = "";
  }

  applySort(value: string): void { this.sortBy.set(value); this.closeSortDialog(); }

  clearAll(): void {
    this.searchQuery.set("");
    this.filterBrand.set("");
    this.filterPrice.set("");
    this.filterYear.set("");
    this.filterKm.set("");
    this.filterColor.set("");
    this.filterDamage.set("");
    this.sortBy.set("default");
  }

  goBack(): void { if (window.history.length > 1) this.location.back(); }

  private matchesRange(value: number, range: string): boolean {
    if (!range) return true;
    if (range.endsWith("+")) return value >= Number(range.slice(0, -1));
    const [min, max] = range.split("-").map(Number);
    return value >= min && value <= max;
  }

  private matchesDamage(car: Vehicle, damage: string): boolean {
    if (!damage) return true;
    const text = (car.damageStatus || "").toLocaleLowerCase("tr-TR");
    const clean = car.isDamageFree === true || text.includes("hasarsız") || text.includes("hatasız");
    return damage === "clean" ? clean : !clean;
  }
}
