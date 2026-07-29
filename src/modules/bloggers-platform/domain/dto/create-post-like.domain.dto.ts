import { LikeStatus } from '../../enums/like-status.enum';

export class CreatePostLikeDomainDto {
  postId: string;
  userId: string;
  login: string;
  status: LikeStatus;
}
