import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  audioFiles: any[] = [];
  imageBasePath: string = environment.imageBasePath;
  languageList = [
    {
      "name": "English",
      "code": "EN"
    },
    {
      "name": "Marathi",
      "code": "MR"
    },
    {
      "name": "Hindi",
      "code": "HI"
    },
    {
      "name": "Gujrati",
      "code": "GU"
    },
    {
      "name": "Tamil",
      "code": "TA"
    },
    {
      "name": "Telugu",
      "code": "TE"
    },
    {
      "name": "Kannada",
      "code": "KN"
    },
    {
      "name": "Malayalam",
      "code": "ML"
    }
  ];
  audioDetails: any;
  constructor(private toastr: ToastrService, private fb: FormBuilder) { }

  ngOnInit() {
    this.initializeAudioForm();
  }

  initializeAudioForm() {
    this.audioDetails = this.fb.group({
      bankInput: this.fb.array([]),
    })
  }

  get bankDetailsArray(): FormArray {
    return this.audioDetails.get('bankInput') as FormArray;
  }

  getFormControl(index: number, controlName: string) {
    return (this.bankDetailsArray.at(index) as FormGroup).get(controlName);
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    this.addFile(files);
    event.target.value = null;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      this.addFile(event.dataTransfer.files);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  addFile(files: FileList): boolean {
    if (files.length > 4) {
      this.toastr.warning('You can only upload 4 files at a time');
      return false;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.audioFiles.push({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        data: file,
        url: URL.createObjectURL(file),
        isEdit: false
      });

      this.addFormFile(file);
    }
    return true;
  }

  addFormFile(file: File) {
    const fileForm = this.fb.group({
      primaryLanguage: ['', Validators.required],
      secondaryLanguage: [[], Validators.required],
      numSpeakers: ['', [Validators.required, Validators.min(2), Validators.max(10)]],
      date: ['', Validators.required]
    });

    this.bankDetailsArray.push(fileForm);
  }

  submitForm() {
    console.log(this.audioDetails.value);
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
      audioElements = document.querySelectorAll('.upload-player audio');
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

  updateProgress(event: any, index: number, audioList: any[]): void {
    const audio = event.target;
    const currentTime = audio.currentTime;
    const duration = audio.duration;

    // Update specific audio file's progress and time
    audioList[index].seekValue = (currentTime / duration) * 100;
    audioList[index].currentTime = this.formatTime(currentTime);
    audioList[index].durationTime = this.formatTime(duration);

    this.updateSliderTrack(index, audioList);
  }

  seekAudio(event: any, index: number, audioList: any[]): void {
    const audio = document.querySelectorAll('audio')[index] as HTMLAudioElement;
    const newTime = (event.target.value / 100) * audio.duration;
    audio.currentTime = newTime;
  }

  updateSliderTrack(index: number, audioList: any[]): void {
    const slider = document.querySelectorAll('.seek-bar')[index] as HTMLInputElement;
    if (slider) {
      const value = (audioList[index].seekValue ?? 0) / 100 * slider.offsetWidth;
      slider.style.background = `linear-gradient(to right, #007bff ${audioList[index].seekValue}%, #d3d3d3 ${audioList[index].seekValue}%)`;
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${minutes}:${sec < 10 ? '0' : ''}${sec}`;
  }

  getFormGroupAt(index: number): FormGroup {
    return this.bankDetailsArray.at(index) as FormGroup;
  }

  deleteFile(index: number): void {
    debugger
    console.log('Before Deletion:', this.audioFiles, this.bankDetailsArray);
    this.audioFiles.splice(index, 1);
    this.bankDetailsArray.removeAt(index);
    this.bankDetailsArray.setValue(this.bankDetailsArray.value);
    console.log('After Deletion:', this.audioFiles, this.bankDetailsArray);
  }

  trackByIndex(index: number, _: any): number {
    return index;
  }
}
