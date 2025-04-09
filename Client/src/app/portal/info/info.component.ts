import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MsalService } from '@azure/msal-angular';
import { environment } from 'src/environments/environment';
import { CommonService } from '../service/common.service';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent {
  infoObj:any;
  imageBasePath: string = environment.imageBasePath;
  constructor(private dialog: MatDialog, 
    public infoDialogRef: MatDialogRef<InfoComponent>,
    @Inject(MAT_DIALOG_DATA) public info: {name?:string,title?:string},
    private commonServ:CommonService, private msalService:MsalService
  ) {
    this.infoObj = info;
  }

  ngOnInit(): void {
    this.infoObj = this.info;
  }

  closeInfo() {
    this.infoDialogRef.close();
  }

  AddAnotherProject() {
    this.closeInfo();
  }

  logout() {
    localStorage.clear();
    sessionStorage.clear();
    this.infoDialogRef.close();
    this.msalService.loginRedirect();
    // this.msalService.logout();
    // localStorage.removeItem('User');
  }
  
}
