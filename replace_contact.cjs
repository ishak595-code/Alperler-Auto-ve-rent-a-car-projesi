const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We replace some HTML tags that use openContact() or openAbout() with routerLink
    content = content.replace(/<\button[^>]*\(click\)="openContact\(\)"[^>]*>([\s\S]*?)<\/button>/g, '<a routerLink="/contact" class="inline-flex items-center justify-center bg-slate-800 hover:bg-white hover:text-slate-900 text-slate-300 font-bold py-3 px-6 rounded-lg transition-all duration-300 w-full border border-slate-700 hover:border-white">$1</a>');

    // Or if there is a function logic inside classes:
    // we should replace `this.uiService.toggleContact(true);` with `this.router.navigate(['/contact']);`
    
    // First, make sure `Router` is injected if we need to call `this.router.navigate`
    // Actually, in components like vehicle-card, we might not have Router injected. Let's just find files that have `toggleContact(true)` and maybe inject Router if needed.
    // Easier way is to just do `window.location.href = '/contact';` for the rare places, or correctly inject Router. Actually, almost all have Router!
    
    content = content.replace(/this\.uiService\.toggleContact\(true\);?/g, 'this.router.navigate(["/contact"]);');
    content = content.replace(/this\.uiService\.toggleAbout\(true\);?/g, 'this.router.navigate(["/about"]);');

    // Also replace in footer where it's a list item
    content = content.replace(/<button[^>]*\(click\)="openAbout\(\)"[^>]*>([\s\S]*?)<\/button>/g, '<a routerLink="/about" class="text-slate-400 hover:text-white transition-colors flex items-center group">$1</a>');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

const dirsToScan = ['src'];
function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else {
            if (fullPath.endsWith('.ts') || fullPath.endsWith('.html')) {
                replaceInFile(fullPath);
            }
        }
    }
}

walk('src');
