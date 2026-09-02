import { readFileSync } from 'node:fs';

const checkout = readFileSync('src/pages/booking-checkout.component.ts', 'utf8');
const settings = readFileSync('src/services/payment-settings.service.ts', 'utf8');
const admin = readFileSync('src/pages/admin/admin-payment-settings.component.ts', 'utf8');

const failures = [];
const requireText = (source, needle, message) => {
  if (!source.includes(needle)) failures.push(message);
};
const forbidText = (source, needle, message) => {
  if (source.includes(needle)) failures.push(message);
};

requireText(checkout, 'PaymentSettingsService', 'Checkout must consume the canonical payment settings service.');
requireText(checkout, 'this.paymentSettings.refreshPublic()', 'Checkout must refresh public payment settings from the live source.');
requireText(checkout, 'paymentSettings.settings().officeEnabled', 'Office payment visibility must follow the live admin toggle.');
requireText(checkout, 'paymentSettings.settings().eftEnabled', 'EFT visibility must follow the live admin toggle.');
requireText(checkout, 'paymentSettings.settings().cardEnabled', 'Card visibility must follow the live admin toggle.');
requireText(checkout, 'isPaymentMethodAllowed', 'Checkout must reject methods disabled by live settings.');
requireText(checkout, 'ensureAllowedPaymentMethod', 'Checkout must recover to an enabled payment method when settings change.');
requireText(checkout, 'hasUsablePaymentMethod', 'Checkout must prevent submission when no usable payment method exists.');
requireText(checkout, 'paymentSettings.settings().bankName', 'EFT UI must render the configured bank name.');
requireText(checkout, 'paymentSettings.settings().accountHolder', 'EFT UI must render the configured account holder.');
requireText(checkout, 'paymentSettings.settings().iban', 'EFT UI must render the configured IBAN.');
requireText(checkout, 'formattedIban()', 'EFT UI must display normalized IBAN data without inventing an account.');
forbidText(checkout, '<small>Bilgiler onay sonrası</small>', 'Checkout may not hide configured EFT details behind stale fixed copy.');

requireText(settings, 'bankName:string', 'Payment settings contract must keep a generic bank name field.');
requireText(settings, 'bankName:this.clean(settings.bankName,160)||null', 'Saving payment settings must accept a generic bank name.');
requireText(settings, "iban:this.clean(settings.iban,80).replace(/\\s+/g,'').toUpperCase()||null", 'Saving payment settings must normalize IBAN values.');
requireText(settings, 'bank_name,iban,account_holder', 'Public payment settings read must include bank transfer details.');
requireText(settings, "cache:'no-store'", 'Public payment settings must not use stale browser cache.');

requireText(admin, '[(ngModel)]="form.bankName"', 'Admin must retain editable bank-name input.');
requireText(admin, 'name="bankName"', 'Admin bank field must remain a free editable form control.');
requireText(admin, '[(ngModel)]="form.accountHolder"', 'Admin must retain editable account holder.');
requireText(admin, '[(ngModel)]="form.iban"', 'Admin must retain editable IBAN.');

if (failures.length) {
  console.error('V229 live payment checkout contract failed:\n' + failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('V229 live payment checkout contract passed.');
