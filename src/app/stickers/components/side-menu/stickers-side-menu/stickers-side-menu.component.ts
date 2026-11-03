import { Component } from '@angular/core';
import { MoreMenu } from '../../../../shared/components/more-menu/more-menu';
import { SideMenuHeaderComponent } from '../side-menu-header/side-menu-header.component';
import { SideMenuHistoryComponent } from '../side-menu-history/side-menu-history.component';
import { SideMenuOptionsComponent } from '../side-menu-options/side-menu-options.component';

@Component({
  imports: [SideMenuHeaderComponent, SideMenuHistoryComponent, SideMenuOptionsComponent, MoreMenu],
  selector: 'app-stickers-side-menu',
  templateUrl: './stickers-side-menu.component.html',
})
export class StickersSideMenuComponent {}
