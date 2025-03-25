import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CommonService } from '../service/common.service';
import { ToastrService } from 'ngx-toastr';

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
   userRole: any;

   constructor(private commonServ: CommonService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.userRole = localStorage.getItem('role') || '';
    this.userCode = localStorage.getItem('uId') || '';
    if (this.userRole === "1") {
      this.userCode = '';
    }

    this.getTagsWiseAudio();
  }


  getTagsWiseAudio() {
    debugger
    let userCode = '';
    userCode = this.userRole === "1" ? '' : this.userCode;
    this.commonServ.getTagwiseAudio('audio/all', userCode).subscribe(
      (res: any) => {
        debugger
        console.log('Tags Res', res );
        this.audioTags = res.data.allUniqueTags;
        this.audioNames = res.data.audioData;

        this.audioFiles = res.data.audioData.map((audio: any) => ({
          name: audio.audioName,
          url: audio.audioUrl,
          tags:audio.tags,
          isEdit: false,
          seekValue: 0,
          currentTime: '0:00',
          durationTime: '0:00',
          audioId: audio.audioId,
        }));
      },
      (err: any) => {
        //this.toastr.error('Something Went Wrong!');
        console.log('Something Went Wrong!');
      }
    );
  }

  projectName = '';
  audioTags: string[] = [];
  audioNames: string[] = [];
  selectedTags: string[] = [];
  selectedTag: string = '';
  audioFiles: AudioFile[] = [];
  filterOption: string = '1';

  selectedAudio: string = '';
  selectedAudios: string[] = [];

  imageBasePath: string = environment.imageBasePath;

  isShowFooter: boolean = false;
  
  filterByTag() {
    debugger
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
    debugger
    this.selectedTags = this.selectedTags.filter(t => t !== tag);
  }

  removeAudio(audio: string) {
    debugger
    this.selectedAudios = this.selectedAudios.filter(t => t !== audio);
  }
  
  filteredTags(): string[] {
    return this.audioTags.filter(tag => !this.selectedTags.includes(tag));
  }

  filteredAudios(): string[] {
    if (!this.audioNames) return [];

    const audioNameSet = new Set(this.audioNames.map((audio: any) => audio.audioName));
    return Array.from(audioNameSet);
  }

  getFilteredAudioFiles(): AudioFile[] {
    //debugger
    if (this.filterOption === '1' && this.selectedTags.length) {
      return this.audioFiles.filter(file =>
        file.tags?.some(tag => this.selectedTags.includes(tag))
      );
    }
  
    if (this.filterOption === '2' && this.selectedAudios.length) {
      return this.audioFiles.filter(file =>
        this.selectedAudios.includes(file.name)
      );
    }
  
    return this.audioFiles;
  }
  


  //Media Code
  isPlayingIndexMap: { expansion: number | null; audioFiles: number | null } = {
    expansion: null,
    audioFiles: null
  };

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

  formatTime(timeInSeconds: number): string {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const formattedSeconds = seconds < 10 ? '0' + seconds : seconds;
    return `${minutes}:${formattedSeconds}`;
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
  }

  selectedArr: AudioFile[] = []; // Array for selected files

  toggleSelectFile(file: AudioFile, event: Event): void {
    debugger
    // const isChecked = (event.target as HTMLInputElement).checked;
    // console.log("selectedArr", this.selectedArr);
    // if (isChecked) {
    //    this.isShowFooter = true;
    //    this.selectedArr.push(file);
    //    //this.audioFiles = this.audioFiles.filter((f) => f !== file);
    // }
    // else if (!isChecked) {
    //      this.isShowFooter = false;
    // } else {
    //   //this.audioFiles.push(file);
    //   //this.selectedArr = this.selectedArr.filter((f) => f !== file);
    // }
    const isChecked = (event.target as HTMLInputElement).checked;
  
    if (isChecked) {
      // Add the file to the selectedArr if not already there
      const alreadyExists = this.selectedArr.some(f => f.name === file.name && f.url === file.url);
      if (!alreadyExists) {
        this.selectedArr.push(file);
      }
    } else {
      // Remove file from selectedArr by matching name + url (or other unique identifiers)
      this.selectedArr = this.selectedArr.filter(f => !(f.name === file.name && f.url === file.url));
    }
  
    // Update footer visibility based on remaining selected files
    this.isShowFooter = this.selectedArr.length > 0;
  }

  createNewProject() {
    debugger
    console.log('Project name', this.projectName);
    if (this.projectName === "") {
      this.toastr.error('Please enter project name');
      return;
    }

    console.log('audio id', )
    const payload = {
      userId: this.userCode,  
      projectName: this.projectName, 
      audioIds: this.selectedArr.map(file => ({
      audioId: file.audioId,
    }))
  };
   this.commonServ.CreateProject(payload).subscribe(
    (res: any) => {
      debugger
      console.log('Project Created Successfully:', res);
      this.toastr.success(res);
    }, 
  err => {
    console.error('Error creating project:', err);
    this.toastr.error(err);
  });
} 
  


}