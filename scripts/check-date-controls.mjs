import fs from "node:fs";
import path from "node:path";

const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|html)$/.test(entry.name)) audit(file);
  }
}

function audit(file) {
  const source = fs.readFileSync(file, "utf8");
  const interactiveTag = /<(button|a|input|select|textarea)\b[^>]*>/gi;
  let match;
  while ((match = interactiveTag.exec(source))) {
    const tag = match[0];
    const line = source.slice(0, match.index).split("\n").length;
    if (/aria-hidden=["']true["']/.test(tag) && !/tabindex=["']-1["']/.test(tag)) {
      failures.push(`${file}:${line}: interactive element must not be hidden from the accessibility tree`);
    }
  }

  if (/\.showPicker\s*\(/.test(source)) {
    failures.push(`${file}: showPicker() is forbidden; Alperler uses one semantic trigger button and an owned accessible calendar dialog`);
  }
}

walk("src");

const datePath = "src/components/accessible-native-date.component.ts";
const dateComponent = fs.readFileSync(datePath, "utf8");
const invariants = [
  ['class="date-surface"', 'shared date component must expose the visible date trigger surface'],
  ['type="button"', 'date trigger must be a real semantic button'],
  ['[attr.aria-label]="triggerAccessibleName()"', 'date trigger must own a stable explicit accessible name'],
  ['aria-haspopup="dialog"', 'date trigger must expose its dialog relationship'],
  ['role="dialog"', 'calendar must use dialog semantics'],
  ['aria-modal="true"', 'calendar dialog must be modal for assistive technology'],
  ['role="grid"', 'calendar day matrix must expose grid semantics'],
  ['role="gridcell"', 'calendar day buttons must expose grid-cell semantics'],
  ['[attr.aria-label]="day.ariaLabel"', 'every date button needs a full spoken date'],
  ['aria-label="Önceki ay"', 'previous-month control must be named'],
  ['aria-label="Sonraki ay"', 'next-month control must be named'],
  ['aria-label="Takvimi kapat"', 'close control must be named'],
  ['onDialogKeydown', 'calendar dialog must manage Escape and focus containment'],
  ['onDayKeydown', 'calendar grid must support keyboard date navigation'],
  ['queueMicrotask(() => this.triggerButton?.nativeElement.focus())', 'closing the calendar must restore focus to the trigger'],
  ['<strong>Tarihi seç</strong>', 'the visible control itself must permanently say Tarihi seç'],
];
for (const [needle, message] of invariants) {
  if (!dateComponent.includes(needle)) failures.push(message);
}

const forbidden = [
  ['type="date"', 'shared date component may not use Chromium native date internals because Samsung TalkBack can expose an anonymous nested picker button'],
  ['native-date-control', 'legacy native overlay date control must be removed'],
  ['position:absolute!important;inset:0!important', 'legacy full-surface native input overlay must be removed'],
  ['Takvimden seçin', 'duplicate helper copy around the date trigger must stay removed'],
  ['aria-describedby', 'date trigger must not accumulate duplicate helper announcements'],
];
for (const [needle, message] of forbidden) {
  if (dateComponent.includes(needle)) failures.push(message);
}

if (/<(?:button|a|input|select|textarea)\b[^>]*\btabindex=["']-1["'][^>]*>/i.test(dateComponent)) {
  failures.push('shared date trigger/dialog must not hide a real interactive proxy from sequential focus');
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Date-control guard passed: semantic Tarihi seç button, owned modal calendar dialog, named day controls, focus return, and no Chromium native date proxy.");
