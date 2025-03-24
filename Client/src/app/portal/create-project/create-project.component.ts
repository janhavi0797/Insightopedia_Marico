import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';

interface AudioFile {
  name: string;
  size: string;
  data: File;
  url?: string;
  currentTime?: string;   // Track time for each audio
  durationTime?: string;  // Duration for each audio
  seekValue?: number;     // Seek value for progress bar
  isEdit: boolean
}

@Component({
  selector: 'app-create-project',
  templateUrl: './create-project.component.html',
  styleUrls: ['./create-project.component.scss']
})
export class CreateProjectComponent {

  imageBasePath: string = environment.imageBasePath;
  audioFiles: AudioFile[] = [];

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
        isEdit:false
      });
    }
    event.target.value = null;
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

  isPlayingIndex: number | null = null;

   // Delete file functionality
   deleteFile(index: number): void {
    this.audioFiles.splice(index, 1);
    if (this.isPlayingIndex === index) {
      this.isPlayingIndex = null;
    }
  }

  toggleSelectFile(file: AudioFile, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.selectedArr.push(file);
      //this.audioFiles = this.audioFiles.filter((f) => f !== file);
    } else {
      //this.audioFiles.push(file);
      this.selectedArr = this.selectedArr.filter((f) => f !== file);
    }
  }
  selectedArr: AudioFile[] = []; // Array for selected files

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

  projectName = 'Project 132 Vaicom';
  availableTags = ['Vrijesh', 'Vaicom18', 'Workshop', 'Important'];
  selectedTags: string[] = ['Vrijesh', 'Vaicom18', 'Workshop', 'Important'];
  selectedTag: string = '';
  
  audios = [
    {
      title: 'Audio 1',
      size: '1GB',
      progress: 100,
      selected: true,
      tags: ['Vrijesh', 'Vaicom18', 'Workshop', 'Important']
    }
  ];
  
  get filteredAudios() {
    return this.audios.filter(audio =>
      this.selectedTags.every(tag => audio.tags.includes(tag))
    );
  }
  
  filterByTag() {
    if (this.selectedTag && !this.selectedTags.includes(this.selectedTag)) {
      this.selectedTags.push(this.selectedTag);
    }
    this.selectedTag = '';
  }
  
  removeTag(tag: string) {
    this.selectedTags = this.selectedTags.filter(t => t !== tag);
  }
  
  filteredTags(): string[] {
    return this.availableTags.filter(tag => !this.selectedTags.includes(tag));
  }
}