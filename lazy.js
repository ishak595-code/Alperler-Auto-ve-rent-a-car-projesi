import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;
            content = content.replace(/<img(.*?)>/gi, (match, p1) => {
                if (p1.includes('loading=')) return match;
                updated = true;
                return `<img${p1} loading="lazy">`;
            });
            if (updated) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    }
}

walkDir('./src/pages');
walkDir('./src/components');
