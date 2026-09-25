import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CommentsSqlRepository } from '../../sql/comments.sql-repository';
import { UpdateCommentInputDto } from '../../api/input-dto/update-comment.input-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class UpdateCommentCommand {
  constructor(
    public commentId: string,
    public userId: string,
    public dto: UpdateCommentInputDto,
  ) {}
}

@CommandHandler(UpdateCommentCommand)
export class UpdateCommentUseCase implements ICommandHandler<
  UpdateCommentCommand,
  void
> {
  constructor(private commentsRepository: CommentsSqlRepository) {}

  async execute({
    commentId,
    userId,
    dto,
  }: UpdateCommentCommand): Promise<void> {
    const comment = await this.commentsRepository.findOrNotFoundFail(commentId);

    //чужой комментарий редактировать нельзя -> 403
    if (comment.user_id !== userId) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'comment belongs to another user',
      });
    }

    await this.commentsRepository.updateContent(commentId, userId, dto.content);
  }
}
