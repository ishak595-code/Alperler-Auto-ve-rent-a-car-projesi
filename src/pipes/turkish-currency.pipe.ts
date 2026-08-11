import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'turkishCurrency',
  standalone: true
})
export class TurkishCurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';

    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }
}
