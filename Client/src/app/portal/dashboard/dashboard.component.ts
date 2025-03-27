import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {Component, ElementRef, ViewChild, inject, OnInit} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { MatDatepicker } from '@angular/material/datepicker';
import { MatDateFormats } from '@angular/material/core';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import { DateAdapter } from '@angular/material/core';
import { NativeDateAdapter } from '@angular/material/core';

import {MatAutocompleteSelectedEvent, MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {MatIconModule} from '@angular/material/icon';
import {NgFor, AsyncPipe} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {LiveAnnouncer} from '@angular/cdk/a11y';
import { CommonService } from '../service/common.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  isSaveDisabled: boolean = false;
  date = new FormControl();
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

  // chosenYear: any;

  // chosenYearHandler(normalizedYear: Date) {
  //   this.chosenYear = normalizedYear.getFullYear();
  // }

  // chosenMonthHandler(normalizedMonth: Date, datepicker: any) {
  //   const newDate = new Date(this.chosenYear, normalizedMonth.getMonth());
  //   this.date.setValue(newDate);
  //   datepicker.close();
  // }

  audioDetails: any;
  constructor(private toastr: ToastrService, private fb: FormBuilder, private CommonService: CommonService) { }

  separatorKeysCodes: number[] = [ENTER, COMMA];
  tagInputControl = new FormControl('');

  get items(): FormArray {
    return this.audioDetails.get('items') as FormArray;
  }

  // getTagFormControl(i: number, controlName: string): FormControl {
  //   return this.items.at(i).get(controlName) as FormControl;
  // }

  // getFormControl(index: number, controlName: string) {
  //   return (this.bankDetailsArray.at(index) as FormGroup).get(controlName);
  // }

  getFormControl<T = any>(index: number, controlName: string): FormControl<T> {
    return (this.bankDetailsArray.at(index) as FormGroup).get(controlName) as FormControl<T>;
  }

  addTag(event: any, i: number): void {
    
    const input = event.input;
    const value = event.value?.trim();

    if (value) {
      const tagControl = this.getFormControl(i, 'tagName');
      const tags = tagControl.value || [];
      if (!tags.includes(value)) {
        tagControl.setValue([...tags, value]);
        tagControl.markAsTouched();
      }
    }

    // Clear the input field
    if (input) input.value = '';
    this.tagInputControl.setValue('');
  }

  removeTag(i: number, tag: string): void {
    const tagControl = this.getFormControl(i, 'tagName');
    const tags: string[] = tagControl.value || [];
    tagControl.setValue(tags.filter((t: string) => t !== tag));
  }

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

  // getFormControl(index: number, controlName: string) {
  //   return (this.bankDetailsArray.at(index) as FormGroup).get(controlName);
  // }

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
      tagName: ['', Validators.required],
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
    
    if (index < 0 || index >= this.audioFiles.length || index >= this.bankDetailsArray.length) {
      console.warn('Invalid index:', index);
      return;
    }
  
  
    // Remove the audio file
    this.audioFiles.splice(index, 1);
  
    // Remove the corresponding form control
    this.bankDetailsArray.removeAt(index);
  
  }
  
  trackByIndex(index: number, _: any): number {
    return index;
  }

  // saveAudioFile() {
  //   
  //   console.log('Audio Files', this.audioFiles);
  //   console.log('Audio Details Array', this.bankDetailsArray.value);
    
  //   const userId = localStorage.getItem('uId');
  // const requestBody = [];

  // for (let i = 0; i < this.audioFiles.length; i++) {
  //   const audioDetail = this.bankDetailsArray.value[i];
  //   const audioFile = this.audioFiles[i];

  //   const formattedAudio = {
  //     audioName: audioFile?.data?.name || '',
  //     noOfSpek: audioDetail.numSpeakers,
  //     userId: userId,
  //     audioDate: audioDetail.date || '',  // If needed, format date to yyyy-mm-dd
  //     primary_lang: audioDetail.primaryLanguage,
  //     secondary_lang: audioDetail.secondaryLanguage || [],
  //     tags: [audioDetail.tagName]  // Convert tagName (string) to array
  //   };

  //   requestBody.push(formattedAudio);
  // }

  // console.log('Formatted Request Body:', requestBody);

  //   const formData = new FormData();

  //   const renamedFiles: string[] = [];
  //     for (let j = 0; j < this.audioFiles.length; j++) {
  //       const originalExtension = this.audioFiles[j].data.name.substring(this.audioFiles[j].data.name.lastIndexOf('.'));
  //       const count = j + 1;
  //       const renamedFile = new File([this.audioFiles[j].data], { type: this.audioFiles[j].data.type });
  //       renamedFiles.push(renamedFile.name)
  //       formData.append('files', renamedFile);
  //     }
  //     temp.AudioName = renamedFiles;
  //     TargetGrp.push(temp)
  //     tgArr.push(this.targetGrps.targetGrpArr[i].name);

  //     this.isLoading = true;
  //   this.audioServ.postAPI('audio/upload', formData).subscribe((res: any) => {
  //     this.isLoading = false;
  //     this.ClearProject();
  //     this.ClearMedia();
  //   }, (err: any) => {
  //     this.isLoading = false;
  //     this.toastr.error('Somthing Went Wrong');
  //   })
  // }

  formatDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Returns "yyyy-mm-dd"
  }

  saveAudioFile() {
    //
    const userId = localStorage.getItem('uId');
    const requestBody: any[] = [];
    const formData = new FormData();
  
    for (let i = 0; i < this.audioFiles.length; i++) {
      const audioDetail = this.bankDetailsArray.value[i];
      const audioFile = this.audioFiles[i];
  
      const formattedAudio = {
        audioName: audioFile?.data?.name || '',
        noOfSpek: audioDetail.numSpeakers,
        userId: userId,
        audioDate: this.formatDate(audioDetail.date), // Format to yyyy-mm-dd
        primary_lang: audioDetail.primaryLanguage,
        secondary_lang: audioDetail.secondaryLanguage || [],
        tags: audioDetail.tagName || []
      };
  
      requestBody.push(formattedAudio);
  
      // Append audio file to FormData
      formData.append('files', audioFile.data, audioFile.data.name);
    }
  
    // Append JSON string of metadata
    formData.append('requestBody', JSON.stringify(requestBody));
    //this.isLoading = true;
    this.CommonService.postAPI('audio/upload', formData).subscribe(
      (res: any) => {
        
        //this.isLoading = false;
        //this.ClearProject();
        //this.ClearMedia();
        this.toastr.success('Audio uploaded successfully');
      },
      (err: any) => {
        //this.isLoading = false;
        this.toastr.error('Something went wrong');
      }
    );
  }
  


}
