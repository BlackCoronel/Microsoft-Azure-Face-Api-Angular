import {Component, ViewChild} from '@angular/core';
import {WebcamImage, WebcamInitError, WebcamUtil} from "ngx-webcam";
import {Observable, Subject} from "rxjs";
import {HttpClient} from "@angular/common/http";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private fotoAdjuntaComparar: any;
  private similitud: number = null;

  constructor(private http: HttpClient) {

  }

  public showWebcam = true;
  @ViewChild('fileInput', {static: false}) fileInput;
  public apiEndPointDetection = 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect';
  public apiEndPointFindSimilars = 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0/findsimilars';
  public apiKey = '2b9ac9ba660044b8b7a7ee892ca7bacc';
  public allowCameraSwitch = true;
  public multipleWebcamsAvailable = false;
  public deviceId: string;
  public fotoAdjunta: string | ArrayBuffer = null;
  public videoOptions: MediaTrackConstraints = {
    // width: {ideal: 1024},
    // height: {ideal: 576}
  };
  public errors: WebcamInitError[] = [];

  // latest snapshot
  public webcamImage: any = null;

  // webcam snapshot trigger
  private trigger: Subject<void> = new Subject<void>();
  // switch to next / previous / specific webcam; true/false: forward/backwards, string: deviceId
  private nextWebcam: Subject<boolean|string> = new Subject<boolean|string>();

  public ngOnInit(): void {
    WebcamUtil.getAvailableVideoInputs()
      .then((mediaDevices: MediaDeviceInfo[]) => {
        this.multipleWebcamsAvailable = mediaDevices && mediaDevices.length > 1;
      });
  }

  public triggerSnapshot(): void {
    this.trigger.next();
  }

  public toggleWebcam(): void {
    this.showWebcam = !this.showWebcam;
  }

  public handleInitError(error: WebcamInitError): void {
    this.errors.push(error);
  }

  public showNextWebcam(directionOrDeviceId: boolean|string): void {
    // true => move forward through devices
    // false => move backwards through devices
    // string => move to device with given deviceId
    this.nextWebcam.next(directionOrDeviceId);
  }

  public handleImage(webcamImage: WebcamImage): void {
    this.webcamImage = webcamImage.imageAsDataUrl;
  }

  public cameraWasSwitched(deviceId: string): void {
    console.log('active device: ' + deviceId);
    this.deviceId = deviceId;
  }

  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  public get nextWebcamObservable(): Observable<boolean|string> {
    return this.nextWebcam.asObservable();
  }

  public adjuntarFoto() {
    this.fileInput.nativeElement.click();
  }

  public inputImportFileChange($event) {
    const reader = new FileReader();
    reader.readAsDataURL($event.target.files[0]);
    reader.onload = () => {
      this.fotoAdjunta = reader.result;
    };
    $event.target.value = '';
  }

  public comprobarParentescoImagenes() {
    const paramsDetection = 'returnFaceId=true&returnFaceLandmarks=false&recognitionModel=recognition_02&returnRecognitionModel=false&detectionModel=detection_02';
    let faceIds = [];
    const imageAdjuntaBlob = this.dataURItoBlob(this.fotoAdjunta);
    this.http.post<any>(this.apiEndPointDetection + '?' + paramsDetection, imageAdjuntaBlob, {headers: {'Content-Type': 'application/octet-stream', 'Ocp-Apim-Subscription-Key': this.apiKey}})
      .subscribe( result => {
        result.forEach(detecccion => {
          faceIds.push(detecccion.faceId);
        })
        const imageCapturaBlob = this.dataURItoBlob(this.webcamImage);
        this.http.post<any>(this.apiEndPointDetection + '?' + paramsDetection, imageCapturaBlob, {headers: {'Content-Type': 'application/octet-stream', 'Ocp-Apim-Subscription-Key': this.apiKey}})
          .subscribe( result1 => {
            const similarData = {
              faceId: result1[0].faceId,
              faceIds: faceIds,
              maxNumOfCandidatesReturned: 1,
              mode: "matchPerson"
            }
            this.http.post<any>(this.apiEndPointFindSimilars, similarData, {headers: {'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': this.apiKey}})
              .subscribe( similitud => {
                this.similitud = similitud[0].confidence;
                console.log(this.similitud, similitud);
              })
          })
      });
  }

  public dataURItoBlob(dataURI) {
    const BASE64_MARKER = ';base64,';
    const parts = dataURI.split(BASE64_MARKER);
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  }

}
