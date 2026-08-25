export class CreateDeviceSessionDomainDto {
  userId: string;
  deviceId: string;
  ip: string;
  title: string;
  //дата выпуска refresh-токена и его срок жизни (берутся из iat/exp самого токена)
  lastActiveDate: Date;
  expirationDate: Date;
}
