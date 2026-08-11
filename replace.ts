import fs from 'fs';
import path from 'path';

function walkAndReplace(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (['node_modules', '.git', 'dist', '.next'].includes(file)) continue;
            walkAndReplace(fullPath);
        } else {
            if (fullPath.match(/\.(ts|html|json|js|md|rules)$/)) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let original = content;

                content = content.replace(/Alperler Auto/g, 'Alperler Auto');
                content = content.replace(/ALPERLER AUTO/g, 'ALPERLER AUTO');
                // just in case "Rent a Car" inside "Rent a Car - Tur" was complained about, wait... he said:
                // "Hala burada rent a car ne yapacağız bunu düzelt alperler Auto yapacaksın"
                // No, he wants the FIRST part to be Alperler Auto. 
                // Wait, he said: "Alperler Auto | Rent a Car - Tur - Araç Alım Satım
                // Şimdi bunu sana dedim ki düzelt Hala burada rent a car ne yapacağız bunu düzelt alperler Auto yapacaksın"
                // This implies he sees "Rent A Car" where it should be "Auto".
                content = content.replace(/Alperler Auto/g, 'Alperler Auto');
                content = content.replace(/ALPERLER AUTO/g, 'ALPERLER AUTO');

                if (content !== original) {
                    fs.writeFileSync(fullPath, content, 'utf8');
                    console.log(`Updated ${fullPath}`);
                }
            }
        }
    }
}

walkAndReplace('.');
