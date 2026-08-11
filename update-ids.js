import fs from 'fs';
let content = fs.readFileSync('src/services/mock-data.ts', 'utf8');

let rentalId = 1000;
content = content.replace(/id: 'r-[a-z]+'/g, () => `id: ${++rentalId}`);

let saleId = 2000;
content = content.replace(/id: 's-[a-z]+'/g, () => `id: ${++saleId}`);

let tourId = 3000;
content = content.replace(/id: 't[0-9]+'/g, () => `id: ${++tourId}`);

fs.writeFileSync('src/services/mock-data.ts', content);
console.log('Fixed IDs');
