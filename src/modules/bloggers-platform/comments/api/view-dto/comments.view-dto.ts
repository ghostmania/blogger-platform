import { LikeStatus } from '../../../enums/like-status.enum';
import { Comment } from '../../domain/comment.entity';

export class LikesInfoViewDto {
  likesCount: number;
  dislikesCount: number;
  myStatus: LikeStatus;
}

export class CommentViewDto {
  id: string;
  content: string;
  commentatorInfo: {
    userId: string;
    userLogin: string;
  };
  createdAt: Date;
  likesInfo: LikesInfoViewDto;

  //реакции приходят отдельно: сущность комментария их не хранит
  static mapToView(
    comment: Comment,
    likesInfo: LikesInfoViewDto,
  ): CommentViewDto {
    const dto = new CommentViewDto();
    dto.id = comment.id;
    dto.content = comment.content;
    dto.commentatorInfo = {
      userId: comment.userId,
      userLogin: comment.userLogin,
    };
    dto.createdAt = comment.createdAt;
    dto.likesInfo = likesInfo;
    return dto;
  }
}
