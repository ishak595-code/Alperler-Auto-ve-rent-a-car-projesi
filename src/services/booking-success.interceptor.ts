import { HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { BookingSuccessExperienceService } from './booking-success-experience.service';

export const bookingSuccessInterceptor: HttpInterceptorFn = (request, next) => {
  const experience = inject(BookingSuccessExperienceService);
  const isBookingCreate = request.method === 'POST' && request.url.split('?')[0] === '/api/bookings';
  if (!isBookingCreate) return next(request);

  return next(request).pipe(tap((event) => {
    if (event.type !== HttpEventType.Response) return;
    const body = event.body as { ok?: boolean; booking?: { id?: string; type?: string; itemName?: string } } | null;
    if (!body?.ok || !body.booking?.id) return;
    experience.show({
      reference: body.booking.id,
      type: body.booking.type || 'REQUEST',
      itemName: body.booking.itemName || '',
    });
  }));
};
