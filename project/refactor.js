import * as fs from 'fs';

let content = fs.readFileSync('src/services/car.service.ts', 'utf8');

// Replace _cars and _saleCars with _inventory
let carsMatch = content.match(/private _cars = signal<Car\[\]>\(\[([\s\S]*?)\]\);/);
let saleCarsMatch = content.match(/private _saleCars = signal<SaleCar\[\]>\(\[([\s\S]*?)\]\);/);

if (carsMatch && saleCarsMatch) {
    let carsStr = carsMatch[1];
    let saleCarsStr = saleCarsMatch[1];
    
    // Add category: 'RENTAL' to cars
    carsStr = carsStr.replace(/id: (\d+),/g, "id: $1, category: 'RENTAL', year: 2023,");
    
    // Add category: 'SALE' to saleCars
    saleCarsStr = saleCarsStr.replace(/id: (\d+),/g, "id: $1, category: 'SALE',");
    
    let inventoryStr = `private _inventory = signal<Vehicle[]>([\n${carsStr},\n${saleCarsStr}\n  ]);`;
    
    content = content.replace(carsMatch[0], inventoryStr);
    content = content.replace(saleCarsMatch[0], '');
    
    // Update methods
    content = content.replace(/getCars\(\) \{ return this._cars.asReadonly\(\); \}/g, "getCars() { return computed(() => this._inventory().filter(v => v.category === 'RENTAL')); }");
    content = content.replace(/getCar\(id: number\) \{ return this._cars\(\).find\(c => c.id === id\); \}/g, "getCar(id: number | string) { return this._inventory().find(c => c.id == id && c.category === 'RENTAL'); }");
    content = content.replace(/addCar\(car: Car\) \{\n      this._cars.update\(c => \{\n          if \(car.id && c.find\(x => x.id === car.id\)\) \{\n              return c.map\(x => x.id === car.id \? car : x\);\n          \} else \{\n              return \[\{ \.\.\.car, id: Date.now\(\) \}, \.\.\.c\];\n          \}\n      \}\);\n  \}/g, "addCar(car: Car) {\n      this._inventory.update(inv => {\n          if (car.id && inv.find(x => x.id === car.id)) {\n              return inv.map(x => x.id === car.id ? { ...car, category: 'RENTAL' } : x);\n          } else {\n              return [{ ...car, id: Date.now(), category: 'RENTAL' }, ...inv];\n          }\n      });\n  }");
    content = content.replace(/deleteCar\(id: number\) \{\n      this._cars.update\(cars => cars.filter\(c => c.id !== id\)\);\n  \}/g, "deleteCar(id: number | string) {\n      this._inventory.update(inv => inv.filter(c => c.id !== id));\n  }");
    
    content = content.replace(/getSaleCars\(\) \{ return this._saleCars.asReadonly\(\); \}/g, "getSaleCars() { return computed(() => this._inventory().filter(v => v.category === 'SALE')); }");
    content = content.replace(/getSaleCar\(id: number\) \{ return this._saleCars\(\).find\(c => c.id === id\); \}/g, "getSaleCar(id: number | string) { return this._inventory().find(c => c.id == id && c.category === 'SALE'); }");
    content = content.replace(/addSaleCar\(car: SaleCar\) \{\n      this._saleCars.update\(c => \{\n          if \(car.id && c.find\(x => x.id === car.id\)\) \{\n              return c.map\(x => x.id === car.id \? car : x\);\n          \} else \{\n              return \[\{ \.\.\.car, id: Date.now\(\) \}, \.\.\.c\];\n          \}\n      \}\);\n  \}/g, "addSaleCar(car: SaleCar) {\n      this._inventory.update(inv => {\n          if (car.id && inv.find(x => x.id === car.id)) {\n              return inv.map(x => x.id === car.id ? { ...car, category: 'SALE' } : x);\n          } else {\n              return [{ ...car, id: Date.now(), category: 'SALE' }, ...inv];\n          }\n      });\n  }");
    content = content.replace(/deleteSaleCar\(id: number\) \{\n      this._saleCars.update\(cars => cars.filter\(c => c.id !== id\)\);\n  \}/g, "deleteSaleCar(id: number | string) {\n      this._inventory.update(inv => inv.filter(c => c.id !== id));\n  }");
    
    // Add getVehicle
    content = content.replace(/getSaleCars\(\) \{/, "getVehicle(id: number | string) { return this._inventory().find(v => v.id == id); }\n  getSaleCars() {");
    
    // Fix toggleFavorite
    content = content.replace(/private _favoriteCars = signal<number\[\]>\(\[\]\);/g, "private _favoriteCars = signal<(number|string)[]>([]);");
    content = content.replace(/toggleFavorite\(id: number\)/g, "toggleFavorite(id: number | string)");
    content = content.replace(/isFavorite\(id: number\)/g, "isFavorite(id: number | string)");
    
    // Fix localStorage logic
    content = content.replace(/const cars = localStorage.getItem\('db_cars'\);\n      if \(cars\) \{\n         const parsedCars = JSON.parse\(cars\);\n         if\(parsedCars.length > 0\) this._cars.set\(parsedCars\);\n      \}/g, "const cars = localStorage.getItem('db_cars');\n      if (cars) {\n         const parsedCars = JSON.parse(cars).map((c: any) => ({...c, category: 'RENTAL'}));\n         if(parsedCars.length > 0) this._inventory.update(inv => [...inv.filter(v => v.category !== 'RENTAL'), ...parsedCars]);\n      }");
    content = content.replace(/const saleCars = localStorage.getItem\('db_saleCars'\);\n      if \(saleCars\) \{\n         const parsedSaleCars = JSON.parse\(saleCars\);\n         if \(parsedSaleCars.length < 3\) \{\n            \/\/ Force update to the new 3 cars if the user only has 1\n            this._saleCars.set\(this._saleCars\(\)\);\n         \} else \{\n            this._saleCars.set\(parsedSaleCars\);\n         \}\n      \}/g, "const saleCars = localStorage.getItem('db_saleCars');\n      if (saleCars) {\n         const parsedSaleCars = JSON.parse(saleCars).map((c: any) => ({...c, category: 'SALE'}));\n         if (parsedSaleCars.length >= 3) {\n            this._inventory.update(inv => [...inv.filter(v => v.category !== 'SALE'), ...parsedSaleCars]);\n         }\n      }");
    
    // Fix AI context
    content = content.replace(/this._cars\(\)/g, "this._inventory().filter(v => v.category === 'RENTAL')");
    content = content.replace(/this._saleCars\(\)/g, "this._inventory().filter(v => v.category === 'SALE')");

    fs.writeFileSync('src/services/car.service.ts', content);
    console.log('Refactored car.service.ts');
} else {
    console.log('Could not find matches');
}
