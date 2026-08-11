import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replace',
  standalone: true
})
export class ReplacePipe implements PipeTransform {
  transform(value: string, pattern: string, replacement: string): string {
    if (!value) return '';
    return value.split(pattern).join(replacement);
  }
}
