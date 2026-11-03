import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** Indica si hay conexión a internet (funciona igual en la web y en la app Android) */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly _isOnline = signal(navigator.onLine);
  readonly isOnline = this._isOnline.asReadonly();

  constructor() {
    const setOnline = () => this._isOnline.set(true);
    const setOffline = () => this._isOnline.set(false);

    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    });
  }
}
