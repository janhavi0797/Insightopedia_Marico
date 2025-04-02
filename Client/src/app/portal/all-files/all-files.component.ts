import { AfterViewInit, Component, ViewChild, ViewChildren, QueryList, ElementRef, TemplateRef } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { map, Observable, of, startWith } from 'rxjs';
import { AudioService } from '../service/audio.service';
import { ToastrService } from 'ngx-toastr';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CommonService } from '../service/common.service';

@Component({
  selector: 'app-all-files',
  templateUrl: './all-files.component.html',
  styleUrls: ['./all-files.component.scss']
})
export class AllFilesComponent {

  audioList: any[] = [];

  selectionTagControl = new FormControl('');
  filteredOptions!: Observable<any[]>;
  existingTags: any[] = [];

  // mat table code 
  displayedColumns: string[] = ['audioUrl', 'audioName', 'tags', 'projects', 'status', 'action'];
  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dialogRef!: MatDialogRef<any>;
  audioForm!: FormGroup;
  lastFilter: string = '';
  filteredCompetetiveProduct!: Observable<any[]>;
  selectedUsers: any[] = [];
  tempTagArr: any[] = [];
  currentAudioId: string = '';
  currentIndex!: number;
  constructor(private audioServ: AudioService, private toastr: ToastrService, private dialog: MatDialog,
    private fb: FormBuilder, private commonServ: CommonService
  ) { }

  ngOnInit() {
    this.getAllAudioList();
    this.audioForm = this.fb.group({
      mapUnmapUsers: [[], Validators.required]
    });
  }

  getAllAudioList() {
    this.commonServ.showSpin();
    this.audioServ.getAllAudioList('audio/allFiles').subscribe((res: any) => {
      this.commonServ.hideSpin();
      this.audioList = res?.data?.audioData || [];
      this.dataSource = new MatTableDataSource(this.audioList);
      this.dataSource.paginator = this.paginator;

      this.existingTags = res?.data?.allUniqueTags;
      // this.filteredCompetetiveProduct = of(this.existingTags);
      this.tempTagArr = this.existingTags;
      this.filteredOptions = this.selectionTagControl.valueChanges.pipe(
        startWith(''),
        map(value => this._filter(value || '')),
      );
    }, (err: any) => {
      this.commonServ.hideSpin();
      this.toastr.error('Something Went Wrong!');
    });
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.existingTags.filter((option: any) =>
      option.name.toLowerCase().includes(filterValue)
    );
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent) {
    const selectedProject = event.option.value;
    this.dataSource.filter = selectedProject.trim().toLowerCase();
  }

  emptyTagSearch() {
    const input = this.selectionTagControl.value;
    if (!input) {
      this.dataSource.filter = ''; // Show all
    }
  }

  @ViewChildren('audioRef') audioElements!: QueryList<ElementRef<HTMLAudioElement>>;

  togglePlayPause(element: any, audioEl: HTMLAudioElement): void {
    this.dataSource.data.forEach(item => {
      if (item !== element && item.audio) {
        item.isPlaying = false;
        item.audio?.pause();
      }
    });

    if (!element.audio) {
      element.audio = new Audio(element.audioUrl);
    }

    if (element.isPlaying) {
      element.audio.pause();
    } else {
      element.audio.play();
    }

    element.isPlaying = !element.isPlaying;

    // Pause audio when it ends
    element.audio.onended = () => {
      element.isPlaying = false;
    };
  }

  onAudioEnded(element: any): void {
    element.isPlaying = false;
  }

  editDialog(editTemplate: TemplateRef<any>, index: number) {
    this.currentAudioId = this.audioList[index].audioId;
    this.currentIndex = index;
    this.selectedUsers = this.audioList[index].tags?.map((tag: string) => ({ name: tag, selected: true })) || [];
    this.audioForm.get('mapUnmapUsers')!.setValue(this.selectedUsers);
    this.tempTagArr = this.tempTagArr.map(tag => ({
      ...tag,
      selected: this.selectedUsers.some(user => user.name === tag.name) // Check if name exists in selectedUsers
    })).sort((a, b) => Number(b.selected) - Number(a.selected));;
    this.filteredCompetetiveProduct = of(this.tempTagArr);

    this.dialogRef = this.dialog.open(editTemplate, {
      width: '30%',
      disableClose: true,
    });
  }

  closeDialog() {
    this.dialogRef.close();
    this.audioForm.reset();
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
      return this.existingTags.filter((option: any) => {
        return option.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
      })
    } else {
      return this.existingTags.slice();
    }
  }

  optionClicked(event: Event, user: any, index: number) {
    event.stopPropagation();
    this.toggleSelection(user, index);
  }

  toggleSelection(user: any, index: number) {
    user.selected = !user.selected;

    if (user.selected) {
      this.selectedUsers.push(user);
    } else {
      const i = this.selectedUsers.findIndex((value: any) => value.name === user.name);
      if (i > -1) {
        this.selectedUsers.splice(i, 1);
      }
    }

    this.audioForm.get('mapUnmapUsers')!.setValue([...this.selectedUsers]);
    this.tempTagArr[index].selected = user.selected;
    this.filteredCompetetiveProduct = of(this.tempTagArr);
  }

  displayFn(value: any[] | string): string {
    return '';
  }

  editTag() {
    const tags = this.selectedUsers.map(item => item.name);
    const param = {
      audioId: this.currentAudioId,
      tags: tags
    }
    this.commonServ.showSpin();
    this.commonServ.postAPI('audio/edit-audio-tag', param).subscribe((res) => {
      this.commonServ.hideSpin();
      if (res.statusCode == 200) {
        this.toastr.success('Audio updated successfully!');
        this.audioList[this.currentIndex].tags = tags;
        this.dataSource = new MatTableDataSource(this.audioList);
        this.closeDialog();
      }
    }, (err: any) => {
      this.commonServ.hideSpin();
      this.toastr.error('Something Went Wrong!');
    })
  }
}

