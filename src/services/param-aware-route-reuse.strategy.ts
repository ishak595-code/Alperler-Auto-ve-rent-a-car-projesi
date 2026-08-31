import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

/**
 * Detail routes such as /tour/:id, /fleet/:id and /sales/:id must be rebuilt
 * when the identity parameter changes. The canonical detail components own
 * route-scoped state and intentionally read their initial id once, so reusing
 * the same component instance for another entity can leak stale state.
 */
@Injectable()
export class ParamAwareRouteReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    if (future.routeConfig !== current.routeConfig) return false;

    const futureId = future.paramMap.get('id');
    const currentId = current.paramMap.get('id');
    if ((futureId !== null || currentId !== null) && futureId !== currentId) return false;

    return super.shouldReuseRoute(future, current);
  }
}
