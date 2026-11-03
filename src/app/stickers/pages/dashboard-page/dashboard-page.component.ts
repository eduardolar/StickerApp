import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OfflineBanner } from '../../../shared/components/offline-banner/offline-banner';
import { BottomNav } from '../../components/bottom-nav/bottom-nav';
import { MobileTopBar } from '../../components/mobile-top-bar/mobile-top-bar';
import { ScrollToTopButton } from '../../components/scroll-to-top-button/scroll-to-top-button';
import { StickersSideMenuComponent } from '../../components/side-menu/stickers-side-menu/stickers-side-menu.component';
import { StickerDialog } from '../../components/sticker-dialog/sticker-dialog';
import { StickerDialogService } from '../../services/sticker-dialog.service';

@Component({
  imports: [
    RouterOutlet,
    ScrollToTopButton,
    StickersSideMenuComponent,
    MobileTopBar,
    BottomNav,
    OfflineBanner,
    StickerDialog,
  ],
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
})
export default class DashboardPageComponent {
  protected readonly dialogService = inject(StickerDialogService);
}
