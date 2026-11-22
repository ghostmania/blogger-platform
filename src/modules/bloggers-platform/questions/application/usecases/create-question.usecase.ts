import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QuestionInputDto } from '../../api/input-dto/question.input-dto';
import { QuestionsTypeOrmRepository } from '../../infrastructure/typeorm/questions.typeorm-repository';

export class CreateQuestionCommand {
  constructor(public dto: QuestionInputDto) {}
}

@CommandHandler(CreateQuestionCommand)
export class CreateQuestionUseCase implements ICommandHandler<
  CreateQuestionCommand,
  string
> {
  constructor(private questionsRepository: QuestionsTypeOrmRepository) {}

  //возвращает id — view-модель контроллер получает отдельным запросом
  async execute({ dto }: CreateQuestionCommand): Promise<string> {
    const question = this.questionsRepository.createInstance({
      body: dto.body,
      correctAnswers: dto.correctAnswers,
    });

    await this.questionsRepository.save(question);

    return question.id;
  }
}
