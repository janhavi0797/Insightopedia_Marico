import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PortalRoutingModule } from './portal-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LayoutComponent } from './layout/layout.component';
import { HttpClientModule } from '@angular/common/http';
import { ToastrModule } from 'ngx-toastr';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InfoComponent } from './info/info.component';

import {MatTabsModule} from '@angular/material/tabs';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButtonModule} from '@angular/material/button';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatGridListModule} from '@angular/material/grid-list';
import { TruncatePipe } from '../shared/truncate.pipe';
import { AllFilesComponent } from './all-files/all-files.component';
import { CreateProjectComponent } from './create-project/create-project.component';
import { ProjectAnalysisComponent } from './project-analysis/project-analysis.component';
import { UserListComponent } from './user-list/user-list.component';
import { ProjectDetailsComponent } from './project-details/project-details.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import {MatRadioModule} from '@angular/material/radio';

@NgModule({
  declarations: [
    DashboardComponent,
    LayoutComponent,
    InfoComponent,
    TruncatePipe,
    AllFilesComponent,
    CreateProjectComponent,
    ProjectAnalysisComponent,
    UserListComponent,
    ProjectDetailsComponent
  ],
  imports: [
    //Basic Modules
    CommonModule,
    PortalRoutingModule,
    HttpClientModule,
    ToastrModule.forRoot(),
    ReactiveFormsModule,
    FormsModule,

    //Material Modules
    MatTabsModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatExpansionModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatGridListModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatRadioModule
  ],
  providers: []
})
export class PortalModule { }
