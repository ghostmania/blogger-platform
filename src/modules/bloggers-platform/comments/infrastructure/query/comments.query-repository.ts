import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, isValidObjectId } from 'mongoose';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { GetCommentsQueryParams } from '../../api/input-dto/get-comments-query-params.input-dto';
import { CommentViewDto } from '../../api/view-dto/comments.view-dto';
import {
  Comment,
  CommentDocument,
  CommentModelType,
} from '../../domain/comment.entity';
import { CommentLikesRepository } from '../comment-likes.repository';
import { LikeStatus } from '../../../enums/like-status.enum';

@Injectable()
export class CommentsQueryRepository {
  constructor(
    @InjectModel(Comment.name)
    private CommentModel: CommentModelType,
    private commentLikesRepository: CommentLikesRepository,
  ) {}

  async getByIdOrNotFoundFail(
    id: string,
    userId: string | null = null,
  ): Promise<CommentViewDto> {
    const comment = isValidObjectId(id)
      ? await this.CommentModel.findOne({ _id: id, deletedAt: null })
      : null;

    if (!comment) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'comment not found',
      });
    }

    const [view] = await this.mapToViewWithLikes([comment], userId);

    return view;
  }

  async getAllForPost(
    postId: string,
    query: GetCommentsQueryParams,
    userId: string | null = null,
  ): Promise<PaginatedViewDto<CommentViewDto[]>> {
    const filter: FilterQuery<Comment> = {
      postId,
      deletedAt: null,
    };

    const comments = await this.CommentModel.find(filter)
      .sort({ [query.sortBy]: query.sortDirection })
      .skip(query.calculateSkip())
      .limit(query.pageSize);

    const totalCount = await this.CommentModel.countDocuments(filter);

    const items = await this.mapToViewWithLikes(comments, userId);

    return PaginatedViewDto.mapToView({
      items,
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }

  /**
   * myStatus не хранится в документе комментария — дочитываем реакции
   * текущего пользователя пачкой на всю страницу, чтобы не было N+1.
   */
  private async mapToViewWithLikes(
    comments: CommentDocument[],
    userId: string | null,
  ): Promise<CommentViewDto[]> {
    if (!comments.length) {
      return [];
    }

    if (!userId) {
      return comments.map((comment) => CommentViewDto.mapToView(comment));
    }

    const myStatusByCommentId =
      await this.commentLikesRepository.findStatusesByCommentIds(
        comments.map((comment) => comment._id.toString()),
        userId,
      );

    return comments.map((comment) =>
      CommentViewDto.mapToView(
        comment,
        myStatusByCommentId.get(comment._id.toString()) ?? LikeStatus.None,
      ),
    );
  }
}
