import {AfterViewInit, Component, ViewChild, TemplateRef} from '@angular/core';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { FormControl } from '@angular/forms';
import { map, Observable, startWith } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-project-analysis',
  templateUrl: './project-analysis.component.html',
  styleUrls: ['./project-analysis.component.scss']
})
export class ProjectAnalysisComponent {

  constructor(private toastr: ToastrService) {}

  displayedColumns: string[] = ['userName', 'projectName', 'createdTime', 'status', 'view'];
  
  dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  filteredOptions!: Observable<any[]>;
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
      projectName: this.selectedProject,
      isAllFile: val
    }
    this.getProjectData(param);
  }

  getProjectData(param:any) {}

  selectedProjects: Map<string, string> = new Map();
  myUserControl = new FormControl('');
  filteredOptionsUser!: Observable<any[]>;

  deleteConfirm() {
    if (this.selectedProjects.size === 0) {
      this.toastr.warning('No projects selected for deletion');
      return;
    }
 }

 emptyUser() {}

 onOptionSelectedUser(event: any): void {}

 viewDetails(param1: string, param2: string) {}

}

export interface PeriodicElement {
  userName: string; 
  projectName: string;
  createdTime: string;
  status: number;
  view: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  { userName: 'test1', projectName: 'sample1', createdTime: 'March 2025', status: 1, view: '' },
  { userName: 'test2', projectName: 'sample2', createdTime: 'March 2025', status: 0, view: '' },
  { userName: 'test3', projectName: 'sample3', createdTime: 'March 2025', status: 2, view: '' },
  { userName: 'test4', projectName: 'sample4', createdTime: 'March 2025', status: 0, view: '' },
  { userName: 'test5', projectName: 'sample5', createdTime: 'March 2025', status: 1, view: '' },
  { userName: 'test6', projectName: 'sample6', createdTime: 'March 2025', status: 2, view: '' },
  { userName: 'test7', projectName: 'sample7', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test8', projectName: 'sample8', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test9', projectName: 'sample9', createdTime: 'March 2025', status: 2, view: '' },
    { userName: 'test10', projectName: 'sample10', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test11', projectName: 'sample11', createdTime: 'March 2025', status: 2, view: '' },
    { userName: 'test12', projectName: 'sample12', createdTime: 'March 2025', status: 2, view: '' },
    { userName: 'test13', projectName: 'sample13', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test14', projectName: 'sample14', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test15', projectName: 'sample15', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test16', projectName: 'sample16', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test17', projectName: 'sample17', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test18', projectName: 'sample18', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test19', projectName: 'sample19', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test20', projectName: 'sample20', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test21', projectName: 'sample21', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test22', projectName: 'sample22', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test23', projectName: 'sample23', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test24', projectName: 'sample24', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test25', projectName: 'sample25', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test26', projectName: 'sample26', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test27', projectName: 'sample27', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test28', projectName: 'sample28', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test29', projectName: 'sample29', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test30', projectName: 'sample30', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test31', projectName: 'sample31', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test32', projectName: 'sample32', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test33', projectName: 'sample33', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test34', projectName: 'sample34', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test35', projectName: 'sample35', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test36', projectName: 'sample36', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test37', projectName: 'sample37', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test38', projectName: 'sample38', createdTime: 'March 2025', status: 0, view: '' },
    { userName: 'test39', projectName: 'sample39', createdTime: 'March 2025', status: 1, view: '' },
    { userName: 'test40', projectName: 'sample40', createdTime: 'March 2025', status: 0, view: '' }
];
  
