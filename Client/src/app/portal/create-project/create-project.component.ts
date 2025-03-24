import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CommonService } from '../service/common.service';

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
}

@Component({
  selector: 'app-create-project',
  templateUrl: './create-project.component.html',
  styleUrls: ['./create-project.component.scss']
})
export class CreateProjectComponent {

  userCode: any;
   userRole: any;

   constructor(private commonServ: CommonService) {}

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
  
  audios = [
    {
      title: 'Audio 1',
      size: '1GB',
      progress: 100,
      selected: true,
      tags: ['Vrijesh', 'Vaicom18', 'Workshop', 'Important']
    }
  ];
  
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


  //Media Code
  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.audioFiles.push({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        data: file,
        url: URL.createObjectURL(file),
        isEdit:false,
        tags:[]
      });
    }
    event.target.value = null;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();

    if (event.dataTransfer?.files?.length) {
      const files = event.dataTransfer.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.audioFiles.push({
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          data: file,
          url: URL.createObjectURL(file),
          isEdit: false,
          tags: []
        });
      }
    }
  }

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
   deleteFile(index: number): void {
    this.audioFiles.splice(index, 1);
    // if (this.isPlayingIndex === index) {
    //   this.isPlayingIndex = null;
    // }
  }

  seekAudio(event: any, index: number, audioList: any[]): void {
    const audio = document.querySelectorAll('audio')[index] as HTMLAudioElement;
    const newTime = (event.target.value / 100) * audio.duration;
    audio.currentTime = newTime;
  }

  updateProgressFinal(event: any): void {
    // const audio = this.audioPlayerFinal.nativeElement;
    // const currentTime = audio.currentTime;
    // const duration = audio.duration;
    // if (!isNaN(duration)) {
    //   // Calculate percentage for the seek bar
    //   this.seekValueFinal = (currentTime / duration) * 100;

    //   // Update the displayed time
    //   this.currentTimeFinal = this.formatTime(currentTime);
    //   this.durationTimeFinal = this.formatTime(duration);

    //   // Update slider track color
    //   this.updateSliderTrackFinal();
    // }
  }

  updateProgress(event: any, index: number, audioList: any[]): void {
    const audio = event.target;
    const currentTime = audio.currentTime;
    const duration = audio.duration;

    // Update specific audio file's progress and time
    audioList[index].seekValue = (currentTime / duration) * 100;
    // audioList[index].currentTime = this.formatTime(currentTime);
    // audioList[index].durationTime = this.formatTime(duration);

    // this.updateSliderTrack(index, audioList);
  }

  toggleSelectFile(file: AudioFile, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      //this.selectedArr.push(file);
      //this.audioFiles = this.audioFiles.filter((f) => f !== file);
    } else {
      //this.audioFiles.push(file);
      //this.selectedArr = this.selectedArr.filter((f) => f !== file);
    }
  }


}