import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CommentsSqlRepository } from '../../sql/comments.sql-repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class DeleteCommentCommand {
  constructor(
    public commentId: string,
    public userId: string,
  ) {}
}

@CommandHandler(DeleteCommentCommand)
export class DeleteCommentUseCase implements ICommandHandler<
  DeleteCommentCommand,
  void
> {
  constructor(private commentsRepository: CommentsSqlRepository) {}

  async execute({ commentId, userId }: DeleteCommentCommand): Promise<void> {
    const comment = await this.commentsRepository.findOrNotFoundFail(commentId);

    //чужой комментарий удалять нельзя -> 403
    if (comment.user_id !== userId) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'comment belongs to another user',
      });
    }

    await this.commentsRepository.deleteById(commentId, userId);
  }
}
