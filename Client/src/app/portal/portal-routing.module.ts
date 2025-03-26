import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { authGuard } from '../auth/guard/auth.guard';
import { AllFilesComponent } from './all-files/all-files.component';
import { CreateProjectComponent } from './create-project/create-project.component';
import { ProjectAnalysisComponent } from './project-analysis/project-analysis.component';
import { UserListComponent } from './user-list/user-list.component';
import { ProjectDetailsComponent } from './project-details/project-details.component';

const routes: Routes = [
  {
    path:'',
    component:LayoutComponent,
    children: [
      // {path:'dashboard',component:DashboardComponent, canActivate: [authGuard]},
      // {path:'all-files',component:AllFilesComponent, canActivate: [authGuard]},
      // {path:'create-project',component:CreateProjectComponent, canActivate: [authGuard]},
      // {path:'project-analysis',component:ProjectAnalysisComponent, canActivate: [authGuard]},
      // {path:'project-analysis/:projectId',component:ProjectDetailsComponent, canActivate: [authGuard]},
      // {path:'user-list',component:UserListComponent, canActivate: [authGuard]},
      {path:'dashboard',component:DashboardComponent},
      {path:'all-files',component:AllFilesComponent},
      {path:'create-project',component:CreateProjectComponent},
      {path:'project-analysis',component:ProjectAnalysisComponent},
      {path:'project-analysis/:projectId',component:ProjectDetailsComponent},
      {path:'user-list',component:UserListComponent},
      {path:'project-details',component:ProjectDetailsComponent},
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PortalRoutingModule { }
