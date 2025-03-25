import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { FormControl } from '@angular/forms';
import { map, Observable, startWith } from 'rxjs';

@Component({
  selector: 'app-all-files',
  templateUrl: './all-files.component.html',
  styleUrls: ['./all-files.component.scss']
})
export class AllFilesComponent {

  displayedColumns: string[] = ['isPlaying', 'audioFile', 'tags', 'associatedProject'];
  
  dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  togglePlayPause(element: any): void {
    // Stop all others
    this.dataSource.data.forEach(item => {
      if (item !== element) item.isPlaying = false;
    });
  
    element.isPlaying = !element.isPlaying;
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


}

export interface PeriodicElement {
  isPlaying: boolean; 
  audioFile: string;
  tags: string;
  associatedProject: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  { isPlaying: false, audioFile: 'audio1.mp3', tags: 'Tag1, Tag2', associatedProject: 'Project A' },
  { isPlaying: false, audioFile: 'audio2.mp3', tags: 'Tag3', associatedProject: 'Project B' },
  { isPlaying: false, audioFile: 'audio3.mp3', tags: 'Tag4, Tag5', associatedProject: 'Project C' },
  { isPlaying: false, audioFile: 'audio4.mp3', tags: 'Tag6', associatedProject: 'Project D' },
  { isPlaying: false, audioFile: 'audio5.mp3', tags: 'Tag1, Tag3', associatedProject: 'Project E' },
  { isPlaying: false, audioFile: 'audio1.mp3', tags: 'Tag1, Tag2', associatedProject: 'Project A' },
  { isPlaying: false, audioFile: 'audio2.mp3', tags: 'Tag3', associatedProject: 'Project B' },
  { isPlaying: false, audioFile: 'audio3.mp3', tags: 'Tag4, Tag5', associatedProject: 'Project C' },
  { isPlaying: false, audioFile: 'audio4.mp3', tags: 'Tag6', associatedProject: 'Project D' },
  { isPlaying: false, audioFile: 'audio5.mp3', tags: 'Tag1, Tag3', associatedProject: 'Project E' },
  { isPlaying: false, audioFile: 'audio1.mp3', tags: 'Tag1, Tag2', associatedProject: 'Project A' },
  { isPlaying: false, audioFile: 'audio2.mp3', tags: 'Tag3', associatedProject: 'Project B' },
  { isPlaying: false, audioFile: 'audio3.mp3', tags: 'Tag4, Tag5', associatedProject: 'Project C' },
  { isPlaying: false, audioFile: 'audio4.mp3', tags: 'Tag6', associatedProject: 'Project D' },
  { isPlaying: false, audioFile: 'audio5.mp3', tags: 'Tag1, Tag3', associatedProject: 'Project E' },
  { isPlaying: false, audioFile: 'audio1.mp3', tags: 'Tag1, Tag2', associatedProject: 'Project A' },
  { isPlaying: false, audioFile: 'audio2.mp3', tags: 'Tag3', associatedProject: 'Project B' },
  { isPlaying: false, audioFile: 'audio3.mp3', tags: 'Tag4, Tag5', associatedProject: 'Project C' },
  { isPlaying: false, audioFile: 'audio4.mp3', tags: 'Tag6', associatedProject: 'Project D' },
  { isPlaying: false, audioFile: 'audio5.mp3', tags: 'Tag1, Tag3', associatedProject: 'Project E' },
  { isPlaying: false, audioFile: 'audio1.mp3', tags: 'Tag1, Tag2', associatedProject: 'Project A' },
  { isPlaying: false, audioFile: 'audio2.mp3', tags: 'Tag3', associatedProject: 'Project B' },
  { isPlaying: false, audioFile: 'audio3.mp3', tags: 'Tag4, Tag5', associatedProject: 'Project C' },
  { isPlaying: false, audioFile: 'audio4.mp3', tags: 'Tag6', associatedProject: 'Project D' },
  { isPlaying: false, audioFile: 'audio5.mp3', tags: 'Tag1, Tag3', associatedProject: 'Project E' },
  { isPlaying: false, audioFile: 'audio1.mp3', tags: 'Tag1, Tag2', associatedProject: 'Project A' },
  { isPlaying: false, audioFile: 'audio2.mp3', tags: 'Tag3', associatedProject: 'Project B' },
  { isPlaying: false, audioFile: 'audio3.mp3', tags: 'Tag4, Tag5', associatedProject: 'Project C' },
  { isPlaying: false, audioFile: 'audio4.mp3', tags: 'Tag6', associatedProject: 'Project D' },
  { isPlaying: false, audioFile: 'audio5.mp3', tags: 'Tag1, Tag3', associatedProject: 'Project E' },
];