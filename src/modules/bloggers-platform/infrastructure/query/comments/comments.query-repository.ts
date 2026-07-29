import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, isValidObjectId } from 'mongoose';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { GetCommentsQueryParams } from '../../../api/comments/input-dto/get-comments-query-params.input-dto';
import { CommentViewDto } from '../../../api/comments/view-dto/comments.view-dto';
import { Comment, CommentModelType } from '../../../domain/comment.entity';

@Injectable()
export class CommentsQueryRepository {
  constructor(
    @InjectModel(Comment.name)
    private CommentModel: CommentModelType,
  ) {}

  async getByIdOrNotFoundFail(id: string): Promise<CommentViewDto> {
    const comment = isValidObjectId(id)
      ? await this.CommentModel.findOne({ _id: id, deletedAt: null })
      : null;

    if (!comment) {
      throw new NotFoundException('comment not found');
    }

    //без авторизации myStatus=None (значение по-умолчанию mapToView)
    return CommentViewDto.mapToView(comment);
  }

  async getAllForPost(
    postId: string,
    query: GetCommentsQueryParams,
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

    const items = comments.map((comment) => CommentViewDto.mapToView(comment));

    return PaginatedViewDto.mapToView({
      items,
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }
}
