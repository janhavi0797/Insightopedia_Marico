import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginPageComponent } from './auth/login-page/login-page.component';

const routes: Routes = [
  {path:'',  pathMatch:'full', redirectTo:'/portal/dashboard' },
  {path:'login',component:LoginPageComponent},
  {
    path:'portal',
    loadChildren: () => import('../app/portal/portal.module').then((m) => m.PortalModule),
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
