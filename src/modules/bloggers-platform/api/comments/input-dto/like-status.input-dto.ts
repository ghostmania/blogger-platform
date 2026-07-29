import { IsEnum } from 'class-validator';
import { LikeStatus } from '../../../enums/like-status.enum';

//dto для боди при выставлении реакции на комментарий (PUT /comments/:id/like-status)
export class LikeStatusInputDto {
  @IsEnum(LikeStatus)
  likeStatus: LikeStatus;
}
