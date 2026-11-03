import { Component, inject } from '@angular/core';
import { NetworkStatusService } from '../../services/network-status.service';

/** Aviso que aparece mientras no hay conexión a internet */
@Component({
  selector: 'app-offline-banner',
  templateUrl: './offline-banner.html',
})
export class OfflineBanner {
  protected readonly networkStatus = inject(NetworkStatusService);
}
