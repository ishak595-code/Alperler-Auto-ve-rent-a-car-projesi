import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { FavoritesV217Component } from './favorites-v217.component';
import { RentalCatalogV217Component } from './rental-catalog-v217.component';

@Component({
  selector:'app-fleet',
  standalone:true,
  imports:[RentalCatalogV217Component,FavoritesV217Component],
  template:`@if(favoritesMode()){<app-favorites-v217 />}@else{<app-rental-catalog-v217 />}`,
})
export class FleetComponent {
  private readonly route=inject(ActivatedRoute);
  readonly favoritesMode=toSignal(
    this.route.queryParamMap.pipe(map((params)=>params.get('favs')==='true')),
    {initialValue:this.route.snapshot.queryParamMap.get('favs')==='true'},
  );
}
