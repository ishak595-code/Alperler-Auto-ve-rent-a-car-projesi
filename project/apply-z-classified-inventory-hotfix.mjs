#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`${label}: expected source text not found`);
  return source.replace(from, to);
}

// Always restore the final list component after earlier home hotfixes run.
{
  let component = await readFile('project/templates/vehicle-list-item.component.ts.template', 'utf8');
  component = component
    .replace('../../src/models/car.model', '../models/car.model')
    .replace('../../src/services/car.service', '../services/car.service')
    .replace('../../src/pipes/turkish-currency.pipe', '../pipes/turkish-currency.pipe');
  await writeFile('src/components/vehicle-list-item.component.ts', component, 'utf8');
}

// Rental inventory page.
{
  const path = 'src/pages/fleet.component.ts';
  let s = await readFile(path, 'utf8');
  s = s.replace(
    'import { VehicleCardComponent } from "../components/vehicle-card.component";',
    'import { VehicleListItemComponent } from "../components/vehicle-list-item.component";',
  );
  s = s.replace(
    'imports: [CommonModule, FormsModule, MatIconModule, VehicleCardComponent, RouterLink],',
    'imports: [CommonModule, FormsModule, MatIconModule, VehicleListItemComponent, RouterLink],',
  );
  s = s.replace(
    'class="bg-slate-900 border-b border-slate-800 sticky top-[72px] md:top-[96px] z-40 shadow-lg"',
    'class="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg"',
  );
  s = s.replace('              Filomuz\n', '              Kiralık Araçlar\n');

  const oldList = `          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0">
            @for (car of sortedCars(); track car.id) {
              <app-vehicle-card
                [car]="car"
                [variant]="car.category === 'SALE' ? 'sale' : 'rental'"
                [withDriver]="withDriver()"
              >
              </app-vehicle-card>
            }
          </div>`;
  const newList = `          <div class="mx-auto flex max-w-5xl flex-col gap-3 px-3 sm:gap-4 sm:px-4 md:px-0">
            @for (car of sortedCars(); track car.id) {
              <app-vehicle-list-item
                [car]="car"
                [variant]="car.category === 'SALE' ? 'sale' : 'rental'"
              ></app-vehicle-list-item>
            }
          </div>`;
  s = replaceOnce(s, oldList, newList, 'rental list rows');
  await writeFile(path, s, 'utf8');
}

// Sales inventory page.
{
  const path = 'src/pages/sales.component.ts';
  let s = await readFile(path, 'utf8');
  s = s.replace(
    'import { VehicleCardComponent } from "../components/vehicle-card.component";',
    'import { VehicleListItemComponent } from "../components/vehicle-list-item.component";',
  );
  s = s.replace('    VehicleCardComponent,', '    VehicleListItemComponent,');
  s = s.replace(
    'class="text-3xl md:text-4xl font-bold text-slate-900 mb-2"',
    'class="text-3xl md:text-4xl font-bold text-white mb-2"',
  );

  const oldList = `          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            @for (car of filteredCars(); track car.id) {
              <app-vehicle-card [car]="car" variant="sale"></app-vehicle-card>
            }
          </div>`;
  const newList = `          <div class="mx-auto flex max-w-5xl flex-col gap-3 sm:gap-4">
            @for (car of filteredCars(); track car.id) {
              <app-vehicle-list-item [car]="car" variant="sale"></app-vehicle-list-item>
            }
          </div>`;
  s = replaceOnce(s, oldList, newList, 'sales list rows');
  await writeFile(path, s, 'utf8');
}

// Homepage: keep curated horizontal showcase, but make the rental and sales inventories true one-row-per-vehicle lists.
{
  const path = 'src/pages/home.component.ts';
  let s = await readFile(path, 'utf8');
  s = s.replaceAll(
    'class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 max-w-7xl mx-auto mb-12 md:mb-16"',
    'class="mx-auto flex max-w-5xl flex-col gap-3 sm:gap-4 mb-12 md:mb-16"',
  );

  s = s.replace(
    '<img [src]="car.images?.[0] || car.image" [alt]="car.brand + \' \' + car.model" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />',
    '<img [src]="car.images?.[0] || car.image" (error)="handleRecommendedImageError($event)" [alt]="car.brand + \' \' + car.model" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />',
  );

  if (!s.includes('handleRecommendedImageError(event: Event)')) {
    s = replaceOnce(
      s,
      `  hideBrokenImage(event: Event) {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }
`,
      `  hideBrokenImage(event: Event) {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }

  handleRecommendedImageError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }
`,
      'recommended image fallback',
    );
  }
  await writeFile(path, s, 'utf8');
}

console.log('Rental and sales inventories now use stable ID-linked list rows and open dedicated detail routes.');
