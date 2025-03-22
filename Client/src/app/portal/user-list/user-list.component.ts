import {AfterViewInit, Component, ViewChild, TemplateRef} from '@angular/core';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { FormControl } from '@angular/forms';
import { map, Observable, startWith, of } from 'rxjs';

import { CommonService } from '../service/common.service';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent {

  userList: any[] = [];
  isLoading: boolean = false;
  userForm!: FormGroup;
  roles: any[] = [
    {
      name: "Base User",
      code: "1"
    },
    {
      name: "Admin User",
      code: "2"
    },
    {
      name: "Read User",
      code: "3"
    }
  ];

  dialogRef!: MatDialogRef<any>;
  lastFilter: string = '';
  selectedUsers: any[] = new Array<any>();
  mapUnmapUsers: any[] = [];
  filteredCompetetiveProduct!: Observable<any[]>;

  // mat table code 
  // displayedColumns: string[] = ['userName', 'email', 'rolecode', 'action'];
  // dataSource = new MatTableDataSource<any>([]);
  // @ViewChild(MatPaginator) paginator!: MatPaginator;

   displayedColumns: string[] = ['userName', 'email', 'rolecode', 'action'];
   dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
   @ViewChild(MatPaginator) paginator!: MatPaginator;
  
    ngAfterViewInit() {
      this.dataSource.paginator = this.paginator;
    }
  

  constructor(private commonServ: CommonService, private toastr: ToastrService,
    private fb: FormBuilder, private dialog: MatDialog
  ) {
    this.userForm = this.fb.group({
      userName: ['', Validators.required],
      userEmail: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      mapUnmapUsers: [[]]
    });
  }

  ngOnInit() {
    this.isLoading = true;
    this.getUserList();
  }

  getUserList() {
    debugger
    this.commonServ.getAPI('users/all').subscribe((res: any) => {
      debugger
      this.isLoading = false;
      this.userList = res;
      //this.dataSource = new MatTableDataSource(res); // ✅ Correctly set MatTableDataSource
      //this.dataSource.paginator = this.paginator;
    }, (err: any) => {
      this.isLoading = false;
      this.toastr.error('Something Went Wrong!')
    });
  }

  editDialog(editTemplate: TemplateRef<any>, index: number) {
    debugger
    console.log(this.dataSource.data[index].userName);

    this.userForm.controls['userName'].setValue(this.dataSource.data[index].userName);
    this.userForm.controls['userEmail'].setValue(this.dataSource.data[index].email);
    this.userForm.controls['role'].setValue(this.dataSource.data[index].rolecode);

    // this.userForm.controls['userName'].setValue(this.userList[index].userName);
    // this.userForm.controls['userEmail'].setValue(this.userList[index].email);
    // this.userForm.controls['role'].setValue(this.userList[index].rolecode);

    this.assignMapUnmapUser(index);

    this.userForm.get('mapUnmapUsers')!.setValue(this.selectedUsers);

    this.dialogRef = this.dialog.open(editTemplate, {
      width: '30%',
      disableClose: true,
    });
  }

  submitForm() {
    const userIds = this.selectedUsers.map(user => user.userid);
    const param = {
      name: this.userForm.value.userName,
      email: this.userForm.value.userEmail,
      role: this.userForm.value.role,
      mapUser: userIds
    }
    this.commonServ.postAPI('users/edit', param).subscribe((res: any) => {
      this.toastr.success(res.message);
      this.closeDialog();
      this.getUserList()
    }, (err: any) => {
      this.toastr.error('Something Went Wrong!');
    })
  }

  closeDialog() {
    this.dialogRef.close();
    this.userForm.reset();
  }

  filterForCompetitor() {
    this.filteredCompetetiveProduct = of(this.lastFilter).pipe(
      startWith<string>(''),
      map(value => (typeof value === 'string' ? value : this.lastFilter)),
      map(filter => this.filter(filter))
    );
  }

  filter(filter: string): any[] {
    this.lastFilter = filter;
    if (filter) {
      return this.mapUnmapUsers.filter(option => {
        return option.email.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
      })
    } else {
      return this.mapUnmapUsers.slice();
    }
  }

  optionClicked(event: Event, user: any) {
    event.stopPropagation();
    this.toggleSelection(user);
  }

  toggleSelection(user: any) {
    user.selected = !user.selected;
    if (user.selected) {
      this.selectedUsers.push(user);
    } else {
      const i = this.selectedUsers.findIndex((value: any) => value.email === user.email);
      this.selectedUsers.splice(i, 1);
    }

    this.userForm.get('mapUnmapUsers')!.setValue(this.selectedUsers);
    this.filteredCompetetiveProduct = of(this.mapUnmapUsers);
  }

  displayFn(value: any[] | string): string {
    return '';
  }

  assignMapUnmapUser(index: number) {
    //const email = this.userList[index].email;
    const email = this.dataSource.data[index].email;
    this.mapUnmapUsers = [];
    //this.mapUnmapUsers = this.userList.filter(user => user.email !== email)
    // this.mapUnmapUsers = this.dataSource.data.filter(user => user.email !== email)
    // .map(user => ({
    //   ...user,
    //   selected: this.userList[index]?.mapUser?.includes(user.id) ? true : false
    // })).sort((a, b) => Number(b.selected) - Number(a.selected));

    // this.selectedUsers = this.userList[index]?.mapUser
    //   ? this.userList
    //     .filter(user => this.userList[index].mapUser.includes(user.id))
    //     .map(user => ({ ...user, selected: true }))
    //   : [];

    // this.filteredCompetetiveProduct = of(this.mapUnmapUsers);
  }

  // togglePlayPause(element: any): void {
  //   // Stop all others
  //   this.dataSource.data.forEach(item => {
  //     if (item !== element) item.isPlaying = false;
  //   });
  
  //   element.isPlaying = !element.isPlaying;
  // }

  // filteredOptions!: Observable<any[]>;
  // myControl = new FormControl('');

}

export interface PeriodicElement {
  userName: string; 
  email: string;
  rolecode: string;
  action: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  { userName: 'user1', email: 'user1@gmail.com', rolecode: '1', action: '' },
  { userName: 'user2', email: 'user2@gmail.com', rolecode: '2', action: '' },
  { userName: 'user3', email: 'user3@gmail.com', rolecode: '3', action: '' },
  { userName: 'user4', email: 'user4@gmail.com', rolecode: '1', action: '' },
  { userName: 'user5', email: 'user5@gmail.com', rolecode: '2', action: '' },
  { userName: 'user6', email: 'user6@gmail.com', rolecode: '1', action: '' },
  { userName: 'user7', email: 'user7@gmail.com', rolecode: '3', action: '' },
  { userName: 'user8', email: 'user8@gmail.com', rolecode: '2', action: '' },
  { userName: 'user9', email: 'user9@gmail.com', rolecode: '3', action: '' },
  { userName: 'user10', email: 'user10@gmail.com', rolecode: '1', action: '' },
  { userName: 'user11', email: 'user11@gmail.com', rolecode: '2', action: '' },
  { userName: 'user12', email: 'user12@gmail.com', rolecode: '3', action: '' },
  { userName: 'user13', email: 'user13@gmail.com', rolecode: '1', action: '' },
  { userName: 'user14', email: 'user14@gmail.com', rolecode: '3', action: '' },
  { userName: 'user15', email: 'user15@gmail.com', rolecode: '2', action: '' },
  { userName: 'user16', email: 'user16@gmail.com', rolecode: '1', action: '' },
  { userName: 'user17', email: 'user17@gmail.com', rolecode: '3', action: '' },
  { userName: 'user18', email: 'user18@gmail.com', rolecode: '2', action: '' },
  { userName: 'user19', email: 'user19@gmail.com', rolecode: '1', action: '' },
  { userName: 'user20', email: 'user20@gmail.com', rolecode: '3', action: '' },
  { userName: 'user21', email: 'user21@gmail.com', rolecode: '2', action: '' },
  { userName: 'user22', email: 'user22@gmail.com', rolecode: '3', action: '' },
  { userName: 'user23', email: 'user23@gmail.com', rolecode: '1', action: '' },
  { userName: 'user24', email: 'user24@gmail.com', rolecode: '2', action: '' },
  { userName: 'user25', email: 'user25@gmail.com', rolecode: '1', action: '' },
  { userName: 'user26', email: 'user26@gmail.com', rolecode: '3', action: '' },
  { userName: 'user27', email: 'user27@gmail.com', rolecode: '2', action: '' },
  { userName: 'user28', email: 'user28@gmail.com', rolecode: '1', action: '' },
  { userName: 'user29', email: 'user29@gmail.com', rolecode: '3', action: '' },
  { userName: 'user30', email: 'user30@gmail.com', rolecode: '2', action: '' },
  { userName: 'user31', email: 'user31@gmail.com', rolecode: '1', action: '' },
  { userName: 'user32', email: 'user32@gmail.com', rolecode: '3', action: '' },
  { userName: 'user33', email: 'user33@gmail.com', rolecode: '2', action: '' },
  { userName: 'user34', email: 'user34@gmail.com', rolecode: '1', action: '' },
  { userName: 'user35', email: 'user35@gmail.com', rolecode: '2', action: '' },
];

