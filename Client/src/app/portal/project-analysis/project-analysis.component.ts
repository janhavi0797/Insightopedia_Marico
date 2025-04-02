import { AfterViewInit, Component, ViewChild, TemplateRef } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { FormControl } from '@angular/forms';
import { map, Observable, startWith } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from '../service/common.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-project-analysis',
  templateUrl: './project-analysis.component.html',
  styleUrls: ['./project-analysis.component.scss']
})
export class ProjectAnalysisComponent {
  project: any[] = [];
  userCode: string = '';
  ELEMENT_DATA: PeriodicElement[] = [];
  filteredProject: any[] = [];
  constructor(private toastr: ToastrService, private common: CommonService, private router: Router) { }

  displayedColumns: string[] = ['userName', 'projectName', 'createdTime', 'status', 'view'];

  dataSource = new MatTableDataSource<PeriodicElement>(this.ELEMENT_DATA);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  ngOnInit() {
    let code = localStorage.getItem('uId') || '';
    const param = {
      user: code,
      isAllFile: 1
    }
    this.getProjectData(param);
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  filteredOptions!: Observable<any[]>;
  filteredOptionsProject!: Observable<any[]>;
  myControl = new FormControl('');

  emptyProject() {
    // if (this.myControl.value === "") {
    //   this.selectedProject = "";
    //   const param = {
    //     user: this.userCode,
    //     projectName: this.selectedProject
    //   }
    //   this.getProjectData(param);
    // }
    if (!this.myControl.value) {
      this.filteredProject = [...this.project]; // Reset list when input is cleared
      this.mapProjectData(this.filteredProject);
    }
  }

  onOptionSelected(event: any): void {
    // if (event.option.value !== this.selectedProject) {
    //   this.selectedProject = event.option.value;
    //   const param = {
    //     user: this.userCode,
    //     projectName: this.selectedProject
    //   };
    //   this.getProjectData(param);
    // }
  }


  isAllFiles: boolean = true;
  count: number = 0;
  userRole: string = "";
  selectedProject: string = '';

  changeFileOption(val: number) {
    this.isAllFiles = (val === 1);
    var code = ''
    if (this.isAllFiles) {
      if (this.userRole !== "1") {
        code = localStorage.getItem('uId') || '';
      } else {
        code = ''
      }
    } else {
      code = localStorage.getItem('uId') || '';
    }
    const param = {
      user: code,
      //projectName: this.selectedProject,
      isAllFile: val
    }
    this.getProjectData(param);
  }

  getProjectData(param: any) {
    this.common.showSpin();
    this.common.getAllProject('project/list', param).subscribe((res: any) => {
      this.project = res.data;
      this.mapProjectData(this.project);
      //this.tempAudioData = res.data.map((x: any) => Object.assign({}, x));
      this.filteredOptionsUser = this.myUserControl.valueChanges.pipe(
        startWith(''),
        map(value => this.filterUsers(value || ''))
      );
      this.filteredOptionsProject = this.myControl.valueChanges.pipe(
        startWith(''),
        map(value => this.filterProjects(value || ''))
      );
      this.count = res.count;
      this.userCode = localStorage.getItem('uId') || '';
      this.common.hideSpin();
    }, (err: any) => {
      this.common.hideSpin();
      this.toastr.error('Something Went Wrong!')
    });
  }
  // filterUsers(value: string): any[] {
  //   const filterValue = value.toLowerCase();
  //   return this.project.filter(user => user.userName.toLowerCase().includes(filterValue));
  // }
  filterUsers(value: string): any[] {
    const filterValue = value.toLowerCase();

    // Extract unique usernames
    const uniqueUsernames = Array.from(
      new Set(this.project.map(user => user.userName))
    );

    // Filter unique usernames based on input value
    return uniqueUsernames
      .filter(userName => userName.toLowerCase().includes(filterValue))
      .map(userName => ({ userName })); // Ensure the structure matches mat-option
  }

  selectedProjects: Map<string, string> = new Map();
  myUserControl = new FormControl('');
  filteredOptionsUser!: Observable<any[]>;

  deleteConfirm() {
    if (this.selectedProjects.size === 0) {
      this.toastr.warning('No projects selected for deletion');
      return;
    }
  }

  emptyUser() {
    if (!this.myControl.value) {
      this.filteredProject = [...this.project]; // Reset list when input is cleared
      this.mapProjectData(this.filteredProject);
    }
  }

  //  onOptionSelectedUser(event: any): void {

  //  }

  onOptionSelectedUser(event: any): void {
    const searchUser = event.option.value;

    if (searchUser) {
      this.filteredProject = this.project.filter(project =>
        project.userName?.toLowerCase() === searchUser.toLowerCase()
      );
    } else {
      this.filteredProject = [...this.project]; // Restore original data when input is cleared
    }

    this.mapProjectData(this.filteredProject);
  }

  filterProjects(value: string): any[] {
    const filterValue = value.toLowerCase();

    // Extract unique project names
    const uniqueProjects = Array.from(
      new Set(this.project.map(proj => proj.projectName))
    );

    // Filter unique project names based on input value
    return uniqueProjects
      .filter(projectName => projectName.toLowerCase().includes(filterValue))
      .map(projectName => ({ projectName: projectName })); // Ensure structure matches mat-option
  }

  onOptionSelectedProject(event: any): void {
    const searchProject = event.option.value;

    if (searchProject) {
      this.filteredProject = this.project.filter(proj => proj.projectName === searchProject);
    } else {
      this.filteredProject = [...this.project]; // Restore full list when input is cleared
    }

    this.mapProjectData(this.filteredProject);
  }




  viewDetails(projectId: string, userId: string) {
    this.router.navigate(['portal/project-details'], {
      queryParams: { projectId, userId }
    });
  }

  mapProjectData(mapData: any[]): void {
    this.ELEMENT_DATA = mapData.map((item) => ({
      userName: item.userName,
      userId: item.userId,
      projectName: item.projectName,
      projectId: item.projectId,
      createdTime: new Date().toLocaleString(),
      status: item.status,
      view: ''
    }));
    this.dataSource.data = this.ELEMENT_DATA;
  }
}
export interface PeriodicElement {
  userName: string;
  userId: string;
  projectName: string;
  projectId: string;
  createdTime: string;
  status: number;
  view: string;
}

