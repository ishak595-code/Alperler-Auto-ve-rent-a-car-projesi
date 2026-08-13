#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/pages/home.component.ts';
let s = await readFile(path, 'utf8');

s = s.replace(
  'import { VehicleCardComponent } from "../components/vehicle-card.component";',
  'import { VehicleListItemComponent } from "../components/vehicle-list-item.component";',
);
s = s.replace('    VehicleCardComponent,\n', '    VehicleListItemComponent,\n');
s = s.replaceAll(
  '<app-vehicle-card [car]="car" variant="rental"></app-vehicle-card>',
  '<app-vehicle-list-item [car]="car" variant="rental"></app-vehicle-list-item>',
);
s = s.replaceAll(
  '<app-vehicle-card [car]="car" variant="sale"></app-vehicle-card>',
  '<app-vehicle-list-item [car]="car" variant="sale"></app-vehicle-list-item>',
);
s = s.replaceAll(
  'class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto mb-12 md:mb-16"',
  'class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 max-w-7xl mx-auto mb-12 md:mb-16"',
);

await writeFile(path, s, 'utf8');
console.log('Homepage rental and sale inventory converted to accessible list rows.');
