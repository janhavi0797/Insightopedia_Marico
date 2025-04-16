import { AfterViewInit, Component, ViewChild, TemplateRef } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { FormControl } from '@angular/forms';
import { map, Observable, startWith } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from '../service/common.service';
import { Router } from '@angular/router';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';

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

  multipleselect: any[] = [];
  multipleProjectSelect: any[] = [];
  selUser = false;
  selProject = false;
  @ViewChild('select') select!: MatSelect;
  @ViewChild('select1') select1!: MatSelect;
  filterUserList: any[] = [];
  filterProjectList: any[] = [];
  searchUserList: any[] = [];
  searchProjectList: any[] = [];
  originalProjectList: any[] = [];
  filteredProjectList : any[] = [];
  projectNames: string[] = [];
  userNames: string[] = [];

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

  myControl = new FormControl('');

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
      this.originalProjectList = this.project;
      this.mapProjectData(this.project);
      
      const userNames = this.project.map((p: any) => p.userName);
      this.filterUserList = [...new Set(userNames)].map(name => ({ name }));
      this.searchUserList = this.filterUserList;

      const projectNames = this.project.map((p: any) => p.projectName);
      this.filterProjectList = [...new Set(projectNames)].map(name => ({ name }));
      this.searchProjectList = this.filterProjectList;

      this.count = res.count;
      this.userCode = localStorage.getItem('uId') || '';
      this.common.hideSpin();
    }, (err: any) => {
      this.common.hideSpin();
      this.toastr.error('Something Went Wrong!')
    });
  }

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

  deleteConfirm() {
    if (this.selectedProjects.size === 0) {
      this.toastr.warning('No projects selected for deletion');
      return;
    }
  }

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
      createdTime: item.projectCreatedAt,
      status: item.status,
      view: ''
    }));
    this.dataSource.data = this.ELEMENT_DATA;
  }


  onUserSelectionChange(): void {
    const selectedUsers = [...this.multipleselect];
  
    if (selectedUsers.length > 0) {
      const filtered = this.originalProjectList.filter(file =>
        selectedUsers.includes(file.userName)
      );
  
      // Update main list
      this.project = [...filtered];
  
      // Filter projects based on selected users
      const projectNameSet = new Set(filtered.map(p => p.projectName));
      this.filterProjectList = this.searchProjectList.filter(p =>
        projectNameSet.has(p.name)
      );
  
      // Retain only selected project names that are valid
      this.multipleProjectSelect = this.multipleProjectSelect.filter(name =>
        projectNameSet.has(name)
      );
  
      // Keep full user list (don't trim users again)
      this.filterUserList = [...this.searchUserList];
      this.userNames = [...this.searchUserList];
    } else {
      // Reset all
      this.project = [...this.originalProjectList];
      this.filterProjectList = [...this.searchProjectList];
      this.projectNames = [...this.searchProjectList];
      this.userNames = [...this.searchUserList];
      this.filterUserList = [...this.searchUserList];
    }
  
    this.applyCombinedFilter();
  }
  
  onProjectSelectionChange(): void {
    
    const selectedProjects = [...this.multipleProjectSelect];
  
    if (selectedProjects.length > 0) {
      const filtered = this.originalProjectList.filter(file =>
        selectedProjects.includes(file.projectName)
      );
  
      // Further filter the project list based on selection
      this.project = filtered;
  
      // Do NOT update user list here — preserve it
      const validUserSet = new Set(this.multipleselect);
  
      //if users are selected, limit projects to those users
      if (validUserSet.size > 0) {
        this.project = this.project.filter(p => validUserSet.has(p.userName));
      }
  
      // Retain only valid project options
      //this.filterProjectList = [...this.searchProjectList];
  
      // Retain only valid selected projects
      const projectNameSet = new Set(this.project.map(p => p.projectName));
      this.multipleProjectSelect = this.multipleProjectSelect.filter(name =>
        projectNameSet.has(name)
      );
    } else {
      // Reset to full project list if no selection
      if (this.multipleselect.length > 0) {
        this.onUserSelectionChange(); // Respect selected users
      } else {
        this.project = [...this.originalProjectList];
        this.filterProjectList = [...this.searchProjectList];
        this.filterUserList = [...this.searchUserList];
        this.userNames = [...this.searchUserList];
      }
    }
  
    this.applyCombinedFilter();
  }
  
  
  
  applyCombinedFilter(): void {
    let filtered = [...this.originalProjectList];
  
    // Filter by selected users if any
    if (this.multipleselect.length > 0) {
      filtered = filtered.filter(item => this.multipleselect.includes(item.userName));
    }
  
    // Filter by selected projects if any
    if (this.multipleProjectSelect.length > 0) {
      filtered = filtered.filter(item => this.multipleProjectSelect.includes(item.projectName));
    }
  
    // Show filtered data in mat-table
    this.mapProjectData(filtered);
  }

  onUserSearchDropdown(id: any) {
    let searchInput =  id.target.value;
    this.filterUserList = [];
    let search = searchInput.toLowerCase();
    if(search.length > 0) {
      const temp = this.searchUserList.filter(d => {
        if (search.includes(d))
          return d.name?.toLowerCase().indexOf(search) !== 1;
        else
          return d.name?.toLowerCase().indexOf(search) !== -1;
      })
      this.filterUserList = temp; 
    }
    else {
      this.filterUserList = this.searchUserList;
    }
  }

  onProjectSearchDropdown(id: any) {
    let searchInput =  id.target.value;
    this.filterProjectList = [];
    let search = searchInput.toLowerCase();

    if(search.length > 0) {
      const temp = this.searchProjectList.filter(p => {
        if (search.includes(p))
          return p.name?.toLowerCase().indexOf(search) !== 1;
        else
          return p.name?.toLowerCase().indexOf(search) !== -1;
      })
      this.filterProjectList = temp; 
    }
    else {
      this.filterProjectList = this.searchProjectList;
    }
  }


  toggleAllSelection() {
    if (this.selUser) {
      this.select.options.forEach((item: MatOption) => item.select());
      this.multipleselect = this.filterUserList.map(user => user.name);
    }
    else {
      this.select.options.forEach((item: MatOption) => item.deselect());
      this.multipleselect = [];
    }
    this.onUserSelectionChange();
  }

  toggleAllProjectSelection() {
    if (this.selProject) {
      this.select1.options.forEach((item: MatOption) => item.select());
      this.multipleProjectSelect = this.filterProjectList.map(project => project.name);
    }
    else {
      this.select1.options.forEach((item: MatOption) => item.deselect());
      this.multipleProjectSelect = [];
    }
    this.onProjectSelectionChange();
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

