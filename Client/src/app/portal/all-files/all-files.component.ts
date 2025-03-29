import {AfterViewInit, Component, ViewChild, ViewChildren, QueryList, ElementRef} from '@angular/core';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { FormControl } from '@angular/forms';
import { map, Observable, startWith } from 'rxjs';
import { AudioService } from '../service/audio.service';
import { ToastrService } from 'ngx-toastr';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

interface Project {
  projectId: string;
  projectName: string;
}

interface Audio {
  audioId: string;
  audioName: string;
  audioUrl: string;
  createdAt: string;
  projects: Project[];
  projectId: string;
  projectName: string;
  // Add other properties as needed
}

interface GroupedAudio {
  projectName: string;
  audios: {
    audioId: string;
    audioName: string;
    audioUrl: string;
    createdAt: string;
    tags: string[];
    projectId: string;
    projectName: string;
  }[];
}

@Component({
  selector: 'app-all-files',
  templateUrl: './all-files.component.html',
  styleUrls: ['./all-files.component.scss']
})
export class AllFilesComponent {

  audioList: any[] = [];
  isLoading: boolean = false;

  myControl = new FormControl('');
  filteredOptions!: Observable<string[]>;
  allProjects: string[] = [];

   // mat table code 
   displayedColumns: string[] = ['audioUrl', 'audioName', 'tags', 'projects', 'status', 'action'];
   dataSource = new MatTableDataSource<any>([]);
   @ViewChild(MatPaginator) paginator!: MatPaginator;

   constructor(private audioServ: AudioService, private toastr: ToastrService) {}

   ngOnInit() {
    this.getAllAudioList();

    this.filteredOptions = this.myControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterProjects(value || ''))
    );
  }

  getAllAudioList() {
    this.isLoading = true;
    this.audioServ.getAllAudioList('audio/all').subscribe((res: any) => {
      this.isLoading = false;
      const audioList: Audio[] = res?.data?.audioData || [];
  
      // Grouping by projectName
      const projectAudioMap: { [key: string]: Audio[] } = {};
  
      audioList.forEach((audio: Audio) => {
        audio.projects?.forEach((project: Project) => {
          if (!projectAudioMap[project.projectName]) {
            projectAudioMap[project.projectName] = [];
          }
          projectAudioMap[project.projectName].push({
            ...audio,
            projectId: project.projectId,
            projectName: project.projectName
          });
        });
      });
  
      // Convert map to array
      const groupedArray = Object.entries(projectAudioMap).map(([projectName, audios]) => ({
        projectName,
        audios
      }));

      const flattenedAudios = groupedArray.flatMap(group => {
        return group.audios.map(audio => ({
          ...audio,
          projectName: group.projectName
        }));
      });
      
      // Assign to MatTableDataSource
      this.dataSource = new MatTableDataSource(flattenedAudios);
      this.dataSource.paginator = this.paginator;

      this.allProjects = [...new Set(flattenedAudios.map(audio => audio.projectName))];
      
      this.dataSource.filterPredicate = (data: any, filter: string) => {
        return data.projectName?.toLowerCase().includes(filter);
      };
  
    }, (err: any) => {
      this.isLoading = false;
      this.toastr.error('Something Went Wrong!');
    });
  }

  _filterProjects(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.allProjects.filter(project =>
      project.toLowerCase().includes(filterValue)
    );
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent) {
    const selectedProject = event.option.value;
    this.dataSource.filter = selectedProject.trim().toLowerCase();
  }

  emptyProject() {
    const input = this.myControl.value;
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

 


}

