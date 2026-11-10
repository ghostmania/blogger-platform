import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CommentsTypeOrmRepository } from '../../infrastructure/typeorm/comments.typeorm-repository';
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
  constructor(private commentsRepository: CommentsTypeOrmRepository) {}

  async execute({ commentId, userId }: DeleteCommentCommand): Promise<void> {
    const comment = await this.commentsRepository.findOrNotFoundFail(commentId);

    //чужой комментарий удалять нельзя -> 403
    if (!comment.isAuthoredBy(userId)) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'comment belongs to another user',
      });
    }

    //реакции на комментарий удаляются каскадом в БД
    await this.commentsRepository.delete(comment);
  }
}
