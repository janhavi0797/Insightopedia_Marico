import { ChangeDetectorRef, Component, ElementRef, TemplateRef, ViewChild } from '@angular/core';
import { AudioService } from '../service/audio.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment'
import { CommonService } from '../service/common.service';
import { MatSelectChange } from '@angular/material/select';

@Component({
  selector: 'app-project-details',
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.scss']
})
export class ProjectDetailsComponent {
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

  currentTime: string = '0:00';
  durationTime: string = '0:00';
  seekValue: number = 0;
  tgId: string = '';
  tgName: string = ''

  isPlaying = false;
  audioDetails: any;
  filePath: string = '';

  question: string = "";
  vectorId: string[] = [];
  chatHistory: any[] = [];
  private messageHistorySub!: Subscription;

  selectedTabIndex: number = 0;

  isEdit: boolean = false;

  currentText: string = '';
  replaceText: string = '';
  tempAudioData: any = [];
  imageBasePath: string = environment.imageBasePath;
  audioNameArr:any[] = [];
  audioName:string = '';
  allAudioDetails:any;
  projectId!: string;
  userId!: string;
  allProjectAudioDetails:any;
  
  constructor(private audioServ: AudioService, private cdr: ChangeDetectorRef, private activeRoute: ActivatedRoute,
    private router: Router, private toastr: ToastrService, private dialog: MatDialog,private common: CommonService
  ) { }

  ngOnInit() {
    this.activeRoute.queryParams.subscribe(params => {
      this.projectId = params['projectId'];
      this.userId = params['userId'];;
      this.getProjectDetails(this.projectId);
    });
    
    this.messageHistorySub = this.audioServ.getMessageHistory().subscribe((res: any) => {
      if (res) {
        this.chatHistory.push(res);
      }
    })
  }


  getProjectDetails(projectId:string) {
    this.common.showSpin();
    this.common.getProjectDetail('project/allProjectDetails', projectId).subscribe((res: any) => {
      this.allAudioDetails = res.data.projectDetails[0];
      this.allProjectAudioDetails = res.data;
      //this.audioDetails = res.data.projectDetails[0].AudioData[0];
      this.audioDetails = this.combineAudioData(this.allProjectAudioDetails);
       //this.filePath = res.data.FilePath;
       //this.vectorId = res.data.vectorId;
      this.tempAudioData = res.data.projectDetails[0].AudioData.map((x: any) => Object.assign({}, x));
      //this.audioNameArr =res.data.projectDetails[0].AudioData.map(((item: { audioName: any; })=> item.audioName));
      this.audioNameArr = ["All Project", ...res.data.projectDetails[0].AudioData.map((item: { audioName: any }) => item.audioName)];
      this.audioName = this.audioNameArr[0];
      this.common.hideSpin();
    }, (err: any) => {
      this.common.hideSpin();
    })
  }

  ngAfterViewInit(): void {
    this.seekValue = 0;
  }

  updateProgress(event: any): void {
    const audio = this.audioPlayer.nativeElement;
    const currentTime = audio.currentTime;
    const duration = audio.duration;
    if(!isNaN(duration)) {
        // Calculate percentage for the seek bar
    this.seekValue = (currentTime / duration) * 100;

    // Update the displayed time
    this.currentTime = this.formatTime(currentTime);
    this.durationTime = this.formatTime(duration);

    // Update slider track color
    this.updateSliderTrack();
    }
  }

  seekAudio(event: any): void {
    const audio = this.audioPlayer.nativeElement;
    const newTime = (event.target.value / 100) * audio.duration;
    audio.currentTime = newTime;
  }

  updateSliderTrack(): void {
    const slider = document.querySelector('.seek-bar') as HTMLInputElement;
    if (slider) {
      const value = (this.seekValue / 100) * slider.offsetWidth;
      slider.style.background = `linear-gradient(to right, #007bff ${this.seekValue}%, #d3d3d3 ${this.seekValue}%)`;
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${minutes}:${sec < 10 ? '0' : ''}${sec}`;
  }

  togglePlayPause(): void {
    const audio = this.audioPlayer.nativeElement;
    if (audio.paused) {
      if (this.currentTime === '0:00') {
        audio.load();
      }
      audio.play();
      this.isPlaying = true;
    } else {
      audio.pause();
      this.isPlaying = false;
    }
  }

  // Seek forward by 30 seconds
  seekForward(): void {
    const audio = this.audioPlayer.nativeElement;
    audio.currentTime = Math.min(audio.currentTime + 30, audio.duration); // Ensure it doesn't go beyond duration
  }

  // Seek backward by 10 seconds
  seekBackward(): void {
    const audio = this.audioPlayer.nativeElement;
    audio.currentTime = Math.max(audio.currentTime - 10, 0); // Ensure it doesn't go below 0
  }

  back() {
    this.chatHistory = [];
    if (this.messageHistorySub) {
      this.messageHistorySub.unsubscribe();
    }
    this.router.navigate(["portal/project-analysis"]);
  }

  sendQuery() {
    if (this.question !== "") {
      const payload = {
        question: this.question,
        vectorId: this.audioDetails?.vectorId ?? ['']
      }
      this.audioServ.sendQueryAI('chat/chatVectorId', payload).subscribe((res: any) => {
        this.audioServ.messageHistory.next({
          from: 'AI',
          message: res.answer
        });
        this.question = '';
      }, (err: any) => {
        this.common.hideSpin();
        this.toastr.error('Something Went Wrong!')
      })
    } else {
      this.toastr.warning('Enter Your Question');
    }
  }

  editTranslation() {
    this.isEdit = true
  }
  cancelEdit() {
    this.audioDetails.AudioData = this.tempAudioData.map((x: any) => Object.assign({}, x));
    this.isEdit = false;
  }
  updateTranslation() {
    this.common.showSpin();
    const payload = {
      editData: {
        TGId: this.tgId,
        audiodata: this.audioDetails.AudioData,
      },
      vectorIds: this.audioDetails.VectorId,
      audioName: this.audioName
    }
    this.audioServ.postAPI('audio/edit', payload).subscribe((res: any) => {
      if (res.statusCode === 200) {
        this.toastr.success(res.message);
        this.tempAudioData = this.audioDetails.AudioData.map((x: any) => Object.assign({}, x));
        this.common.hideSpin();
        this.isEdit = false;
      }
    }, (err: any) => {
      this.cancelEdit();
      this.common.hideSpin();
      this.toastr.error('Something Went Wrong!');
    });
  }

  replace(dialogTemplate: TemplateRef<any>) {
    this.dialog.open(dialogTemplate, {
      height: '40vh',
      width: '25vw',
      disableClose: true,
    });
  }

  replaceTextFunct() {
    if (this.replaceText === '') {
      this.toastr.error('Replace Text is Empty')
      return;
    }
    if (this.currentText === '') {
      this.toastr.error('Current Text is Empty')
      return;
    }
    this.common.showSpin();
    const regex = new RegExp(`\\b${this.currentText}\\b`, 'gi');
    this.audioDetails.AudioData.forEach((item: any) => {
      if (item.translation) {
        // Replace the text in the translation key
        item.translation = item.translation.replace(regex, this.replaceText);
      }
    });
    const payload = {
      editData: {
        TGId: this.tgId,
        audiodata: this.audioDetails.AudioData,
      },
      vectorIds: this.audioDetails.VectorId,
      audioName: this.audioName
    }
    this.audioServ.postAPI('audio/edit', payload).subscribe((res: any) => {
      if (res.statusCode === 200) {
        this.toastr.success(res.message);
        this.tempAudioData = this.audioDetails.AudioData.map((x: any) => Object.assign({}, x));
        this.common.hideSpin();
        this.currentText = '';
        this.replaceText = '';
      }
    }, (err: any) => {
      this.cancelEdit();
      this.common.hideSpin();
      this.toastr.error('Something Went Wrong!');
    })

  }

  // downloadSummaryAndSenti(content:string) {
  //   const url = `${environment.BASE_URL}audio/generate-pdf?id=${this.tgId}&type=${content}&key=${this.audioName}`;
  //   this.audioServ.getDownload(url);
  // }

  downloadSummaryAndSenti(content: string, audioId?: string, projectId?: string): void {
    if (!audioId && !projectId) {
      console.error("Both projectId and audioId are missing.");
      return;
    }
  
    let idParam = "";
    let keyParam = "";
  
    if (projectId) {
      idParam = projectId;
      keyParam = "project";
    } 
    if (audioId) {
      idParam = audioId; // Override if only audioId is present
      keyParam = "audio";
    }
  
    const url = `${environment.BASE_URL}audio/generate-pdf?id=${idParam}&type=${content}&key=${keyParam}`;

    let fileName = this.allAudioDetails?.projectName ? `${this.allAudioDetails?.projectName}-${content}` : `${content}`;
    if (!fileName.endsWith('.pdf')) {
      fileName += '.pdf';
    }
    this.audioServ.getDownload(url, fileName);
  }
  

  isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value);
  }

  downloadChat(audioId?: string, projectId?: string) {
    if (!audioId && !projectId) {
      console.error("Both projectId and audioId are missing.");
      return;
    }

    let idParam = "";
    let keyParam = "";
  
    if (projectId) {
      idParam = projectId;
      keyParam = "project";
    } 
    if (audioId) {
      idParam = audioId; // Override if only audioId is present
      keyParam = "audio";
    }


    if(this.chatHistory.length === 0) {
      this.toastr.warning('Chat is Empty');
      return 0;
    }
    const month = String(new Date().getMonth() + 1).padStart(2, '0'); // Months are zero-based, so we add 1
    const day = String(new Date().getDate()).padStart(2, '0');

    const date = `${new Date().getFullYear()}-${month}-${day}`;
    const param = {
      "id": idParam,
      "key": keyParam,
      "chat": this.chatHistory
    };
    this.audioServ.postAPI('chat/download', param, true).subscribe((res: Blob) => {
      // Handle the PDF response correctly as a Blob
      const blob = new Blob([res], { type: 'application/pdf' });
      const downloadURL = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      let fileName = this.allAudioDetails?.projectName ? `${this.allAudioDetails?.projectName}` : 'projectChat.pdf';
    if (!fileName.endsWith('.pdf')) {
      fileName += '.pdf';
    }

      link.href = downloadURL;
      link.download = fileName;
      link.click();
    }, (err) => {
      this.toastr.error('Something Went Wrong!');
    });
    return true;
  }


//   combineAudioData(audioDataArray: ProjectDetails[]): any {
//     return {
//       audioName: audioDataArray.AudioData.map(audio => audio.audioName).join(', '),
//       tags: audioDataArray.flatMap(audio => audio.tags || []),
//       audioUrls: audioDataArray.map(audio => audio.audioUrl),
//       sentiment_analysis: audioDataArray
//         .map(audio => audio.sentiment_analysis)
//         .filter(Boolean)
//         .join('. '),

//       audiodata: audioDataArray.flatMap(audio => 
//         (audio.audiodata || []).map((data, index) => ({
//           ...data,
//           audioTitle: index === 0 ? audio.audioName : undefined
//         }))
//       ),

//       combinedTranslation: audioDataArray
//         .map(audio => audio.combinedTranslation)
//         .filter(Boolean)
//         .join(' '),

//       translation: audioDataArray.flatMap(audio => 
//         (audio.audiodata || []).map((data, index) => ({
//           translation: data.translation,
//           audioTitle: index === 0 ? audio.audioName : undefined
//         }))
//       ),
//       summary: audioDataArray
//             .map(audio => audio.summary)
//             .filter(Boolean)
//             .join('. '),
//       vectorId: audioDataArray.flatMap(audio => audio.vectorId || []),
      
//     };
// }



  
  
  
  
  
  

  // onAudioNameChange(event: any) {
  //   let index = this.audioNameArr.indexOf(event.value);
  //   if(index == 0){
  //     this.audioDetails = this.combineAudioData(this.allAudioDetails);
  //   }else{
  //     this.audioDetails = this.allAudioDetails.AudioData[index - 1];
  //   }
  //   const audio = this.audioPlayer.nativeElement;
  //   this.tempAudioData = this.allAudioDetails.AudioData[index].audiodata.map((x: any) => Object.assign({}, x));
  //   audio.load();
  //   this.isPlaying = false;
  //   this.currentTime = '0:00';
  // }

  combineAudioData(projectDetailsArray: ProjectDetailsArray[]): any {
    if (!Array.isArray(projectDetailsArray)) {
        //console.error("Expected an array, but got:", projectDetailsArray);
        projectDetailsArray = projectDetailsArray ? [projectDetailsArray] : []; 
    }

    return {
      audioName: projectDetailsArray
        .flatMap(proj => proj.projectDetails[0].AudioData?.map(audio => audio.audioName) ?? [])
        .join(', '),

      tags: projectDetailsArray
        .flatMap(proj => proj.projectDetails[0].AudioData?.flatMap(audio => audio.tags ?? []) ?? []),

      audioUrls: projectDetailsArray
        .flatMap(proj => proj.projectDetails[0].AudioData?.map(audio => audio.audioUrl) ?? []),

      sentiment_analysis: projectDetailsArray
        .map(proj => proj.projectDetails[0].sentiment_analysis) // ✅ Use `.map()` for strings
        .filter(Boolean)
        .join('. '), // ✅ Join multiple values

      audiodata: projectDetailsArray
        .flatMap(proj =>
          proj.projectDetails[0].AudioData?.flatMap(audio =>
            (audio.audiodata ?? []).map((data,index) => ({
              ...data,
              audioTitle: index === 0 ? audio.audioName : undefined
            }))
          ) ?? []
        ),

      //         audiodata: audioDataArray.flatMap(audio => 
      //   (audio.audiodata || []).map((data, index) => ({
      //     ...data,
      //     audioTitle: index === 0 ? audio.audioName : undefined
      //   }))
      // ),

      translation: projectDetailsArray
        .flatMap(proj =>
          proj.projectDetails[0].AudioData?.flatMap(audio =>
            (audio.audiodata ?? []).map(data => ({
              translation: data.translation,
              audioTitle: audio.audioName
            }))
          ) ?? []
        ),

      summary: projectDetailsArray
        .map(proj => proj.projectDetails[0].summary)
        .filter(Boolean)
        .join('. '),

      vectorId: projectDetailsArray
        .flatMap(proj => proj.projectDetails[0].AudioData?.flatMap(audio => audio.vectorId ?? []) ?? []),
    };
}

 
  

  onAudioNameChange(event: MatSelectChange) {
    if (!event || !event.value) {
      console.warn("Invalid selection event:", event);
      return;
    }
    const index = this.audioNameArr.indexOf(event.value);
  
    if (index === -1) {
      console.warn("Audio name not found in array.");
      return;
    }
  
    if (index === 0) {
      this.audioDetails = this.combineAudioData(this.allProjectAudioDetails);
    } else {
      this.audioDetails = this.allAudioDetails.AudioData[index - 1] || null;
    }
  
    if (this.audioDetails && this.audioPlayer?.nativeElement) {
      const audio = this.audioPlayer.nativeElement;
      this.tempAudioData = this.allAudioDetails.AudioData.map((x: any) => ({ ...x }));
      audio.load();
      this.isPlaying = false;
      this.currentTime = '0:00';
    } else {
      console.warn("No audio details found for the selected index.");
    }
  }
  



}
// export interface AudioData {
//   audioId: string;
//   audioName: string;
//   audioUrl: string;
//   audiodata: TranscriptionData[];
//   combinedTranslation?: string;
//   sentiment_analysis?: string;
//   summary?: string;
//   tags?: string[];
//   userId?: string;
//   vectorId?: string[];
// }

// export interface TranscriptionData {
//   speaker: string | number;
//   timestamp: string;
//   transcription: string;
//   translation: string;
// }

// export interface ProjectDetails {
//     sentiment_analysis:string;
//     summary:string;
//     AudioData: AudioData[];
// }
export interface ProjectDetailsArray {
  projectDetails: ProjectDetails[];
}

export interface ProjectDetails {
  sentiment_analysis: string;
  summary: string;
  AudioData: AudioData[];
}

export interface AudioData {
  audioId: string;
  audioName: string;
  audioUrl: string;
  audiodata: TranscriptionData[];
  combinedTranslation?: string;
  sentiment_analysis?: string;
  summary?: string;
  tags?: string[];
  userId?: string;
  vectorId?: string[];
}

export interface TranscriptionData {
  speaker: string | number;
  timestamp: string;
  transcription: string;
  translation: string;
}
