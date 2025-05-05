import { Component, TemplateRef, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CommonService } from '../service/common.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
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
  audioFiles: AudioFile[] = [];
  selectedAudios: string[] = [];
  imageBasePath: string = environment.imageBasePath;
  isShowFooter: boolean = false;

  multipleselect: any[] = [];
  multipleAudioSelect: any[] = [];
  searchTagList: any[] = [];
  searchAudioList: any[] = [];
  selTag = false;
  selAudioTag = false;
  @ViewChild('select') select!: MatSelect;
  @ViewChild('select1') select1!: MatSelect;
  filteredAudioFiles : any[] = [];
  originalAudioFiles: AudioFile[] = [];
  isTagSelected: boolean = false;
  tagBasedAudioList: any[] = [];
  switchToggle: boolean = true;
  toggleValue: string = 'all';

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
      //this.userCode = '';
    }
    this.getTagsWiseAudio();
  }


  getTagsWiseAudio() {
    let userCode = '';
    userCode = this.userRole === "1" ? '' : this.userCode;
    this.commonServ.showSpin();
    this.commonServ.getTagwiseAudio('audio/all', userCode).subscribe(
      (res: any) => {
        this.commonServ.hideSpin();
        this.tagList = res.data.allUniqueTags;
        this.searchTagList = this.tagList;
        this.audioNames = res.data.audioData;
        this.searchAudioList = this.audioNames;

        this.audioFiles = res.data.audioData
        .filter((audio: any) => audio.uploadStatus === 1)
        .map((audio: any) => ({
          name: audio.audioName,
          url: audio.audioUrl,
          tags: audio.tags,
          isEdit: false,
          seekValue: 0,
          currentTime: '0:00',
          durationTime: '0:00',
          audioId: audio.audioId,
        }));

        this.originalAudioFiles = this.audioFiles;
      },
      (err: any) => {
        this.commonServ.hideSpin();
        this.toastr.error('Something Went Wrong!');
      }
    );
  }

  filteredAudios(): string[] {
    if (!this.audioNames) return [];

    const audioNameSet = new Set(this.audioNames.map((audio: any) => audio.audioName));
    return Array.from(audioNameSet);
  }

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
    this.dialogRef.close();
  }

  viewAudioProcess() {
    this.closeInfo();
    this.router.navigate(['/portal/project-analysis']);
  }

  onTagSearchDropdown(id: any) {
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

  onTagDropdownOpened(opened: boolean) {
    if (opened) {
      this.tagList = [...this.searchTagList];
    }
  }

  onAudioSearchDropdown(id: any) {
    let searchInput = id.target.value;
    this.audioNames = [];
    let search = searchInput.toLowerCase();
    if (search.length > 0) {
      const temp = this.searchAudioList.filter(d => {
        if (search.includes(d))
          return d.audioName?.toLowerCase().indexOf(search) !== 1;
        else
          return d.audioName?.toLowerCase().indexOf(search) !== -1;
      });
      this.audioNames = temp;
    }
    else {
      this.audioNames = this.searchAudioList;
    }
  }

  onAudioDropdownOpened(opened: boolean) {
    if (opened) {
      if (this.isTagSelected) {
        this.audioNames = [...this.tagBasedAudioList]; 
      }
      else {
        this.audioNames = [...this.searchAudioList];
      }
      
    }
  }

  toggleAllSelection() {
    if (this.selTag) {
      this.select.options.forEach((item: MatOption) => item.select());
      this.multipleselect = this.tagList.map(tag => tag.name);
    }
    else {
      this.select.options.forEach((item: MatOption) => item.deselect());
      this.multipleselect = [];
    }

    this.onTagSelectionChange();
  }

  toggleAllAudioSelection() {
    if (this.selAudioTag) {
      this.select1.options.forEach((item: MatOption) => item.select());
      this.multipleAudioSelect = [...this.audioNames];
    }
    else {
      this.select.options.forEach((item: MatOption) => item.deselect());
      this.multipleAudioSelect = [];
    }

    this.onAudioSelectionChange();
  }

  onTagSelectionChange() {
    const selectedTags = [...this.multipleselect];

    if (selectedTags.length > 0) {
      this.switchToggle = true;
    }
    else {
      this.switchToggle = false;
      this.toggleValue = 'all'; 
    }
  
    if (this.toggleValue === 'all' && this.switchToggle === false) {
      this.toggleValue = 'all';

          this.audioFiles = [...this.originalAudioFiles]; // Reset
          this.filteredAudioFiles = [...this.originalAudioFiles];
          this.audioNames = [...this.searchAudioList];
          this.isTagSelected = false;
          return;
    }
  
    if (selectedTags.length > 0) {
      let filtered: AudioFile[] = [];
  
      if (this.toggleValue === 'and') {
          if (selectedTags.length === 1) {
            filtered = this.originalAudioFiles.filter(file =>
              Array.isArray(file.tags) &&
              file.tags.length === 1 &&
              file.tags[0] === selectedTags[0]
            );
          }
          else {
            filtered = this.originalAudioFiles.filter(file =>
              Array.isArray(file.tags) &&
              selectedTags.every(tag => file.tags.includes(tag))
            );
          }

      } else if (this.toggleValue === 'or') {
        filtered = this.originalAudioFiles.filter(file =>
          file.tags?.some(tag => selectedTags.includes(tag))
        );
      } else if (this.toggleValue === 'all' && this.switchToggle === true) {
        filtered = this.originalAudioFiles.filter(file =>
          file.tags?.some(tag => selectedTags.includes(tag))
        );
        this.toggleValue = 'or';
      }
    
      this.audioFiles = [...filtered];
      this.filteredAudioFiles = [...filtered];
      this.isTagSelected = true;
    
      const audioNameSet = new Set(filtered.map(f => f.name));
      this.audioNames = this.searchAudioList.filter(a => audioNameSet.has(a.audioName));
      this.multipleAudioSelect = this.multipleAudioSelect.filter(name => audioNameSet.has(name));
      this.tagBasedAudioList = [...this.audioNames];
    }
    else {
          this.audioFiles = [...this.originalAudioFiles]; // Reset
          this.filteredAudioFiles = [...this.originalAudioFiles];
          this.audioNames = [...this.searchAudioList];
          this.isTagSelected = false;
        }    
  }
  
  onAudioSelectionChange() {
    const selectedAudioNames = [...this.multipleAudioSelect];
  
    if (selectedAudioNames.length > 0) {
      const selectedAudioObjs = this.originalAudioFiles.filter(file =>
        selectedAudioNames.includes(file.name)
      );
  
      this.audioFiles = [...selectedAudioObjs]; // Update main list
      this.filteredAudioFiles = [...selectedAudioObjs];
  
      const tagSet = new Set(selectedAudioObjs.flatMap(audio => audio.tags));
      this.tagList = this.searchTagList.filter(tag => tagSet.has(tag.name));
      this.multipleselect = this.multipleselect.filter(tag => tagSet.has(tag));
    } else {
      this.audioFiles = [...this.originalAudioFiles]; // Reset
      this.filteredAudioFiles = [...this.originalAudioFiles];
      this.tagList = [...this.searchTagList];
    }
  }

  getFilteredAudioFiles(): AudioFile[] {
    const tagsSelected = this.multipleselect.length > 0;
    const audiosSelected = this.multipleAudioSelect.length > 0;
  
    if (tagsSelected && audiosSelected) {
      return this.audioFiles.filter(file =>
        this.multipleAudioSelect.includes(file.name) &&
        file.tags?.some(tag => this.multipleselect.includes(tag))
      );
    } else if (tagsSelected) {
      return this.audioFiles.filter(file =>
        file.tags?.some(tag => this.multipleselect.includes(tag))
      );
    } else if (audiosSelected) {
      return this.audioFiles.filter(file =>
        this.multipleAudioSelect.includes(file.name)
      );
    }
  
    return [...this.audioFiles];
  }

  onToggleChange(event: any) {
    const selectedToggle = event.value;

    if (this.multipleselect.length === 0 && selectedToggle !== 'all') {
      this.toastr.warning('Kindly select at least one tag to filter audio files.');
      setTimeout(() => {
        this.toggleValue = 'all';
      });
      return; 
    }
    else if (selectedToggle === 'all') {
        this.multipleselect = [];
        this.switchToggle = false;
        this.onTagSelectionChange();
    }
    else {
      this.toggleValue = selectedToggle;
      this.onTagSelectionChange();
    }
  }
  
}