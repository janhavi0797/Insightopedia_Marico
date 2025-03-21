import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from 'src/app/portal/service/common.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent {
  userDetails:any;
  imageBasePath: string = environment.imageBasePath;
  constructor(readonly msalService: MsalService,readonly router:Router,readonly toastr: ToastrService,
    readonly commonServ:CommonService
  ) { }

  ngOnInit() {
    this.msalService.instance.handleRedirectPromise().then((res:any)=> {
      if(res?.account) {
        this.msalService.instance.setActiveAccount(res.account);
      }
    })
  }

  isLoggedIn():boolean {
    return this.msalService.instance.getActiveAccount() != null;
  }
  
  async login() {
    await this.msalService.instance.initialize();

    this.msalService.loginPopup().subscribe((res: any) => {
      localStorage.setItem('User',res.account.username);
      localStorage.setItem('uId',res.uniqueId);
      this.msalService.instance.setActiveAccount(res.account);
      this.userDetails = res;
      this.addUserDetails()
      localStorage.setItem('LoginTime',new Date().getTime().toString())
      //this.router.navigate(['/portal/dashboard'])
    }, (err) => {
      this.toastr.error('Something Went Wrong!')
    });
  }

  addUserDetails() {
    const payload = {
      "userid": this.userDetails.uniqueId,
      "userName": this.userDetails.account.name,
      "email": this.userDetails.account.username,
      "rolecode": 3
    }
    this.commonServ.postAPI('users/create',payload).subscribe((res:any)=> {
        localStorage.setItem('userName',res.existingUser.userName);
        localStorage.setItem('role',res.existingUser.rolecode)
        if(res.existingUser.rolecode === "3") {
          this.router.navigate(['/portal/allFiles'])
        } else {
          this.router.navigate(['/portal/dashboard'])
        }
    },(err:any)=> {
      this.toastr.error('Something Went Wrong!');
    })
  }
}
