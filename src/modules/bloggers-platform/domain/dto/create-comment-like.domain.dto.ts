import { LikeStatus } from '../../enums/like-status.enum';

export class CreateCommentLikeDomainDto {
  commentId: string;
  userId: string;
  status: LikeStatus;
}
