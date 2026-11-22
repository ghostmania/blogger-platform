import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QuestionsTypeOrmRepository } from '../../infrastructure/typeorm/questions.typeorm-repository';

export class DeleteQuestionCommand {
  constructor(public id: string) {}
}

@CommandHandler(DeleteQuestionCommand)
export class DeleteQuestionUseCase implements ICommandHandler<
  DeleteQuestionCommand,
  void
> {
  constructor(private questionsRepository: QuestionsTypeOrmRepository) {}

  async execute({ id }: DeleteQuestionCommand): Promise<void> {
    const question = await this.questionsRepository.findOrNotFoundFail(id);
    await this.questionsRepository.delete(question);
  }
}
