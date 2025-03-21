import { Component } from '@angular/core';
import { InfoComponent } from '../info/info.component';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  imageBasePath: string = environment.imageBasePath;
  roleCode: string = '';
  userName: string = '';
  constructor(private dialog: MatDialog) {
    this.roleCode = localStorage.getItem('role') || '';
    this.userName = localStorage.getItem('userName') || '';
  }

  logoutModel(event: MouseEvent) {
    const targetElement = event.target as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const info = {
      name: 'profile', title: ''
    }
    this.dialog.open(InfoComponent, {
      position: {
        top: `${rect.bottom + window.scrollY + 5}px`,
        left: `${rect.left + window.scrollX - 50}px`,
      },
      data: info
    });
  }
}
