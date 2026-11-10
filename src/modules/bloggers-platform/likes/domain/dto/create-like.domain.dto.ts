import { LikeStatus } from '../../../enums/like-status.enum';

export class CreateLikeDomainDto {
  targetId: string;
  userId: string;
  status: LikeStatus;
}
