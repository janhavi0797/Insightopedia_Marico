import {AfterViewInit, Component, ViewChild, TemplateRef} from '@angular/core';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { FormControl } from '@angular/forms';
import { map, Observable, startWith } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from '../service/common.service';
import { Router } from '@angular/router';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'app-project-analysis',
  templateUrl: './project-analysis.component.html',
  styleUrls: ['./project-analysis.component.scss']
})
export class ProjectAnalysisComponent {
  project: any[] = [];
  isLoading: boolean = false;
  userCode: string = '';
 ELEMENT_DATA: PeriodicElement[]=[];
  filteredProject: any[]=[];
  constructor(private toastr: ToastrService , private common: CommonService,private router: Router) {}

  displayedColumns: string[] = ['userName', 'projectName', 'createdTime', 'status', 'view'];
  
  dataSource = new MatTableDataSource<PeriodicElement>(this.ELEMENT_DATA);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  ngOnInit() {
   let code = localStorage.getItem('uId') || '';
    const param = {
      user: code,
      //projectName: this.selectedProject,
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

  getProjectData(param:any) {
    this.isLoading = true;
    this.common.getAllProject('project/list', param).subscribe((res: any) => {
      this.project = res.data;
      this.mapProjectData(this.project);
      console.log("project Data",this.project);
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
      this.isLoading = false;
    }, (err: any) => {
      this.isLoading = false;
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
  console.log("searchUser", searchUser);

  if (searchUser) {
    this.filteredProject = this.project.filter(project =>
      project.userName?.toLowerCase() === searchUser.toLowerCase()
    );
  } else {
    this.filteredProject = [...this.project]; // Restore original data when input is cleared
  }

  console.log("Filtered Project:", this.filteredProject);
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
  console.log("Selected Project:", searchProject);

  if (searchProject) {
    this.filteredProject = this.project.filter(proj => proj.projectName === searchProject);
  } else {
    this.filteredProject = [...this.project]; // Restore full list when input is cleared
  }

  this.mapProjectData(this.filteredProject);
}




 viewDetails(projectId: string, userId: string) {
  console.log("View-param1",projectId);
  console.log("View-param2",userId);
  this.router.navigate(['portal/project-details'], { 
    queryParams: { projectId, userId }
  });
 }

 mapProjectData(mapData:any[]): void {
   this.ELEMENT_DATA = mapData.map((item) => ({
    userName: item.userName,
    userId:item.userId,
    projectName: item.projectName,
    projectId:item.projectId,
    createdTime: new Date().toLocaleString(),
    status: item.status,
    view: ''
  }));
  this.dataSource.data = this.ELEMENT_DATA;
}
}
export interface PeriodicElement {
  userName: string; 
  userId:string;
  projectName: string;
  projectId:string;
  createdTime: string;
  status: number;
  view: string;
}

// const ELEMENT_DATA: PeriodicElement[] = [
//   { userName: 'test1', projectName: 'sample1', createdTime: 'March 2025', status: 1, view: '' },
//   { userName: 'test2', projectName: 'sample2', createdTime: 'March 2025', status: 0, view: '' },
//   { userName: 'test3', projectName: 'sample3', createdTime: 'March 2025', status: 2, view: '' },
//   { userName: 'test4', projectName: 'sample4', createdTime: 'March 2025', status: 0, view: '' },
//   { userName: 'test5', projectName: 'sample5', createdTime: 'March 2025', status: 1, view: '' },
//   { userName: 'test6', projectName: 'sample6', createdTime: 'March 2025', status: 2, view: '' },
//   { userName: 'test7', projectName: 'sample7', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test8', projectName: 'sample8', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test9', projectName: 'sample9', createdTime: 'March 2025', status: 2, view: '' },
//     { userName: 'test10', projectName: 'sample10', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test11', projectName: 'sample11', createdTime: 'March 2025', status: 2, view: '' },
//     { userName: 'test12', projectName: 'sample12', createdTime: 'March 2025', status: 2, view: '' },
//     { userName: 'test13', projectName: 'sample13', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test14', projectName: 'sample14', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test15', projectName: 'sample15', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test16', projectName: 'sample16', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test17', projectName: 'sample17', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test18', projectName: 'sample18', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test19', projectName: 'sample19', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test20', projectName: 'sample20', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test21', projectName: 'sample21', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test22', projectName: 'sample22', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test23', projectName: 'sample23', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test24', projectName: 'sample24', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test25', projectName: 'sample25', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test26', projectName: 'sample26', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test27', projectName: 'sample27', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test28', projectName: 'sample28', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test29', projectName: 'sample29', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test30', projectName: 'sample30', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test31', projectName: 'sample31', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test32', projectName: 'sample32', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test33', projectName: 'sample33', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test34', projectName: 'sample34', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test35', projectName: 'sample35', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test36', projectName: 'sample36', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test37', projectName: 'sample37', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test38', projectName: 'sample38', createdTime: 'March 2025', status: 0, view: '' },
//     { userName: 'test39', projectName: 'sample39', createdTime: 'March 2025', status: 1, view: '' },
//     { userName: 'test40', projectName: 'sample40', createdTime: 'March 2025', status: 0, view: '' }
// ];
  
