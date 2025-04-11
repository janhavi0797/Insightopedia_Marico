import { Component, TemplateRef, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CommonService } from '../service/common.service';
import { ToastrService } from 'ngx-toastr';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';

interface AudioFile {
  name: string;
  size: string;
  data: File;
  url?: string;
  currentTime?: string;   // Track time for each audio
  durationTime?: string;  // Duration for each audio
  seekValue?: number;     // Seek value for progress bar
  isEdit: boolean;
  tags: string[];
  audioId: string;
}

@Component({
  selector: 'app-create-project',
  templateUrl: './create-project.component.html',
  styleUrls: ['./create-project.component.scss']
})
export class CreateProjectComponent {

  userCode: any;
  userRole: any; projectName = '';
  audioNames: string[] = [];
  selectedTags: string[] = [];
  selectedTag: string = '';
  audioFiles: AudioFile[] = [];
  filterOption: string = '1';
  selectedAudio: string = '';
  selectedAudios: string[] = [];
  imageBasePath: string = environment.imageBasePath;
  isShowFooter: boolean = false;

  tagList: any[] = [];
   dialogRef!: MatDialogRef<any>;
  formatTime(timeInSeconds: number): string {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const formattedSeconds = seconds < 10 ? '0' + seconds : seconds;
    return `${minutes}:${formattedSeconds}`;
  }


  constructor(private commonServ: CommonService, private toastr: ToastrService, 
    private dialog: MatDialog, private router: Router) { }

  ngOnInit(): void {
    this.userRole = localStorage.getItem('role') || '';
    this.userCode = localStorage.getItem('uId') || '';
    if (this.userRole === "1") {
      this.userCode = '';
    }

    //this.dbCodeList = this.searchDBCodeList;

    this.getTagsWiseAudio();
  }


  getTagsWiseAudio() {
    debugger
    let userCode = '';
    userCode = this.userRole === "1" ? '' : this.userCode;
    this.commonServ.showSpin();
    this.commonServ.getTagwiseAudio('audio/all', userCode).subscribe(
      (res: any) => {
        debugger
        this.commonServ.hideSpin();
        this.tagList = res.data.allUniqueTags;
        this.searchTagList = this.tagList;
        this.audioNames = res.data.audioData;

        this.audioFiles = res.data.audioData.map((audio: any) => ({
          name: audio.audioName,
          url: audio.audioUrl,
          tags: audio.tags,
          isEdit: false,
          seekValue: 0,
          currentTime: '0:00',
          durationTime: '0:00',
          audioId: audio.audioId,
        }));
      },
      (err: any) => {
        this.commonServ.hideSpin();
        this.toastr.error('Something Went Wrong!');
      }
    );
  }

  filterByTag() {
    if (this.selectedTag && !this.selectedTags.includes(this.selectedTag)) {
      this.selectedTags.push(this.selectedTag);
    }
    this.selectedTag = '';
  }

  filterByAudio() {
    if (this.selectedAudio && !this.selectedAudios.includes(this.selectedAudio)) {
      this.selectedAudios.push(this.selectedAudio);
    }
    this.selectedAudio = '';
  }

  removeTag(tag: string) {
    this.selectedTags = this.selectedTags.filter(t => t !== tag);
  }

  removeAudio(audio: string) {
    this.selectedAudios = this.selectedAudios.filter(t => t !== audio);
  }

  filteredAudios(): string[] {
    if (!this.audioNames) return [];

    const audioNameSet = new Set(this.audioNames.map((audio: any) => audio.audioName));
    return Array.from(audioNameSet);
  }

  // getFilteredAudioFiles(): AudioFile[] {
  //   let filteredFiles: AudioFile[] = [];

  //   if (this.filterOption === '1' && this.selectedTags.length) {
  //     filteredFiles = this.audioFiles.filter(file =>
  //       file.tags?.some(tag => this.selectedTags.includes(tag))
  //     );
  //   } else if (this.filterOption === '2' && this.selectedAudios.length) {
  //     filteredFiles = this.audioFiles.filter(file =>
  //       this.selectedAudios.includes(file.name)
  //     );
  //   } else {
  //     filteredFiles = [...this.audioFiles];
  //   }

  //   // Ensure previously selected files are included
  //   const selectedOnly = this.selectedArr.filter(sel =>
  //     !filteredFiles.some(f => f.name === sel.name && f.url === sel.url)
  //   );

  //   return [...selectedOnly, ...filteredFiles];
  // }

  //Media Code
  isPlayingIndexMap: { expansion: number | null; audioFiles: number | null } = {
    expansion: null,
    audioFiles: null
  };

  getSliderBackground(value: number): string {
    const progressColor = '#014FA1';
    const remainingColor = '#DADADA';
    return `linear-gradient(to right, ${progressColor} 0%, ${progressColor} ${value}%, ${remainingColor} ${value}%, ${remainingColor} 100%)`;
  }

  togglePlayPause(index: number, audioList: any[], section: 'expansion' | 'audioFiles'): void {
    let audioElements: NodeListOf<HTMLAudioElement>;

    // Get the correct set of audio elements based on the section ('expansion' or 'audioFiles')
    if (section === 'expansion') {
      audioElements = document.querySelectorAll('.expansion-section audio');
    } else {
      audioElements = document.querySelectorAll('.audio-files-section audio');
    }

    // Handle play/pause logic for the specific section
    const isPlayingIndex = this.isPlayingIndexMap[section];

    if (isPlayingIndex !== null && isPlayingIndex !== index) {
      // Stop the previously playing audio in the same section
      const prevAudio = audioElements[isPlayingIndex] as HTMLAudioElement;
      if (prevAudio) {
        prevAudio.pause();
        prevAudio.currentTime = 0;
      }
    }

    const audio = audioElements[index] as HTMLAudioElement;

    if (audio.paused) {
      audio.play();
      this.isPlayingIndexMap[section] = index;  // Update the playing index for this section
    } else {
      audio.pause();
      this.isPlayingIndexMap[section] = null;  // Reset the playing index for this section
    }
  }

  isPlaying(index: number, section: 'expansion' | 'audioFiles'): boolean {
    return this.isPlayingIndexMap[section] === index;
  }

  // Delete file functionality
  //  deleteFile(index: number): void {
  //   this.audioFiles.splice(index, 1);
  //   if (this.isPlayingIndex === index) {
  //     this.isPlayingIndex = null;
  //   }
  // }

  seekAudio(event: any, index: number, audioList: any[]): void {
    const audio = document.querySelectorAll('audio')[index] as HTMLAudioElement;
    const newTime = (event.target.value / 100) * audio.duration;
    audio.currentTime = newTime;
  }

  updateProgress(event: any, index: number, audioList: any[]): void {
    const audio = event.target;
    const currentTime = audio.currentTime;
    const duration = audio.duration;

    if (!isNaN(duration)) {
      // Set formatted currentTime and duration
      audioList[index].currentTime = this.formatTime(currentTime);
      audioList[index].durationTime = this.formatTime(duration);

      // Update the seek bar value (progress)
      audioList[index].seekValue = (currentTime / duration) * 100;
    }
    if (duration > 0) {
      const progress = (currentTime / duration) * 100;
      this.audioFiles[index].seekValue = progress;
      this.audioFiles[index].currentTime = this.formatTime(currentTime);
      this.audioFiles[index].durationTime = this.formatTime(duration);
    }

  }

  selectedArr: AudioFile[] = []; // Array for selected files

  isFileSelected(file: AudioFile): boolean {
    return this.selectedArr.some(f => f.name === file.name && f.url === file.url);
  }

  toggleSelectFile(file: AudioFile, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (isChecked) {
      // Add the file to the selectedArr if not already there
      const alreadyExists = this.selectedArr.some(f => f.name === file.name && f.url === file.url);
      if (!alreadyExists) {
        if (this.selectedArr.length >= 4) {
          (event.target as HTMLInputElement).checked = false; // Uncheck the checkbox
          this.toastr.warning('You can select only 4 files at a time.');
          return;
        }
        this.selectedArr.push(file);
      }
    } else {
      // Remove file from selectedArr by matching name + url (or other unique identifiers)
      this.selectedArr = this.selectedArr.filter(f => !(f.name === file.name && f.url === file.url));
    }

    // Update footer visibility based on remaining selected files
    this.isShowFooter = this.selectedArr.length > 0;
  }

  createNewProject(InfoTemplate:TemplateRef<any>) {
    if (this.projectName === "") {
      this.toastr.error('Please enter project name');
      return;
    }
    const payload = {
      userId: this.userCode,
      projectName: this.projectName,
      audioIds: this.selectedArr.map(file => ({
        audioId: file.audioId,
      }))
    };
    this.commonServ.showSpin();
    this.commonServ.CreateProject(payload).subscribe(
      (res: any) => {
        this.commonServ.hideSpin();
        if (res.status === "success") {
          this.dialogRef = this.dialog.open(InfoTemplate, {
            width: '50%',
            height: '40%',
            disableClose: true,
          });
        }
      },
      err => {
        this.toastr.error('Something Went Wrong!');
        this.commonServ.hideSpin();
      });
  }

  closeInfo() {
    this.projectName = '';
    this.selectedArr = [];
    this.selectedTags = [];
    this.selectedAudios = [];
    this.selectedAudio = '';
    this.selectedTag = '';
    this.dialogRef.close();
  }

  viewAudioProcess() {
    this.closeInfo();
    this.router.navigate(['/portal/project-analysis']);
  }


  

  multipleselect: any[] = [];
  searchTagList: any[] = [];
  selTag = false;
  @ViewChild('select') select!: MatSelect;
  AllDistributor = "";
  filteredAudioFiles : any[] = [];

  onDistSearchDropdown(id: any) {
    debugger
    let searchInput = id.target.value;
    this.tagList = [];
    let search = searchInput.toLowerCase();
    if (search.length > 0) {
      const temp = this.searchTagList.filter(d => {
        if (search.includes(d))
          return d.name?.toLowerCase().indexOf(search) !== 1;
        else
          return d.name?.toLowerCase().indexOf(search) !== -1;
      });
      this.tagList = temp;
    }
    else {
      this.tagList = this.searchTagList;
    }
  }

  toggleAllSelection() {
    debugger
    if (this.selTag) {
      this.select.options.forEach((item: MatOption) => item.select());
      this.multipleselect = this.tagList.map(tag => tag.name);
    }
    else {
      this.select.options.forEach((item: MatOption) => item.deselect());
      this.multipleselect = [];
      this.AllDistributor = "";
    }

    this.onTagSelectionChange();
  }

  onTagSelectionChange() {
    debugger
    this.selectedTags = [...this.multipleselect];
    this.filteredAudioFiles = this.getFilteredAudioFiles();
  }

  getFilteredAudioFiles(): AudioFile[] {
    let filteredFiles: AudioFile[] = [];
  
    if (this.selectedTags && this.selectedTags.length > 0) {
      filteredFiles = this.audioFiles.filter(file =>
        file.tags?.some(tag => this.selectedTags.includes(tag))
      );
    } else {
      // No tags selected — return all audio files
      filteredFiles = [...this.audioFiles];
    }
  
    // Include previously selected files that aren't in the filter result
    const selectedOnly = this.selectedArr.filter(sel =>
      !filteredFiles.some(f => f.name === sel.name && f.url === sel.url)
    );
  
    return [...selectedOnly, ...filteredFiles];
  }

  
}