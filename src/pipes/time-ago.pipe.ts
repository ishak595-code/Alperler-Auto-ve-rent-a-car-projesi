import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date | number | null | undefined): string {
    if (!value) return '';

    const d = new Date(value);
    const now = new Date();
    const seconds = Math.round(Math.abs((now.getTime() - d.getTime()) / 1000));
    const minutes = Math.round(Math.abs(seconds / 60));
    const hours = Math.round(Math.abs(minutes / 60));
    const days = Math.round(Math.abs(hours / 24));
    const months = Math.round(Math.abs(days / 30.416));
    const years = Math.round(Math.abs(days / 365));

    if (Number.isNaN(seconds)){
      return '';
    } else if (seconds <= 45) {
      return 'Bikaç saniye önce';
    } else if (seconds <= 90) {
      return '1 dk önce';
    } else if (minutes <= 45) {
      return minutes + ' dk önce';
    } else if (minutes <= 90) {
      return '1 saat önce';
    } else if (hours <= 22) {
      return hours + ' saat önce';
    } else if (hours <= 36) {
      return '1 gün önce';
    } else if (days <= 25) {
      return days + ' gün önce';
    } else if (days <= 45) {
      return '1 ay önce';
    } else if (days <= 345) {
      return months + ' ay önce';
    } else if (days <= 545) {
      return '1 yıl önce';
    } else {
      return years + ' yıl önce';
    }
  }
}
