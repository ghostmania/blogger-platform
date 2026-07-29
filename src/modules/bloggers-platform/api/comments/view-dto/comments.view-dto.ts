import { CommentDocument } from '../../../domain/comment.entity';
import { LikeStatus } from '../../../enums/like-status.enum';

export class CommentViewDto {
  id: string;
  content: string;
  commentatorInfo: {
    userId: string;
    userLogin: string;
  };
  createdAt: Date;
  likesInfo: {
    likesCount: number;
    dislikesCount: number;
    myStatus: LikeStatus;
  };

  /**
   * myStatus не хранится в документе комментария — его передаёт
   * query-repository, вычислив под конкретного пользователя на чтении.
   */
  static mapToView(
    comment: CommentDocument,
    myStatus: LikeStatus = LikeStatus.None,
  ): CommentViewDto {
    const dto = new CommentViewDto();

    dto.id = comment._id.toString();
    dto.content = comment.content;
    dto.commentatorInfo = {
      userId: comment.commentatorInfo.userId,
      userLogin: comment.commentatorInfo.userLogin,
    };
    dto.createdAt = comment.createdAt;
    dto.likesInfo = {
      likesCount: comment.likesInfo.likesCount,
      dislikesCount: comment.likesInfo.dislikesCount,
      myStatus,
    };

    return dto;
  }
}
