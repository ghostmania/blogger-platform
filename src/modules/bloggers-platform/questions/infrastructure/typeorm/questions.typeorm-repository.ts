import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../../domain/question.entity';
import { CreateQuestionDomainDto } from '../../domain/dto/create-question.domain.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { isBigintId } from '../../../../../core/database/bigint-id';

@Injectable()
export class QuestionsTypeOrmRepository {
  constructor(
    @InjectRepository(Question)
    private readonly repository: Repository<Question>,
  ) {}

  createInstance(dto: CreateQuestionDomainDto): Question {
    return Question.createInstance(dto);
  }

  async save(question: Question): Promise<void> {
    await this.repository.save(question);
  }

  //нечисловой id уронил бы Postgres ошибкой 22P02 (500 вместо 404)
  findById(id: string): Promise<Question | null> {
    if (!isBigintId(id)) return Promise.resolve(null);
    return this.repository.findOneBy({ id });
  }

  async findOrNotFoundFail(id: string): Promise<Question> {
    const question = await this.findById(id);
    if (!question) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Question not found',
      });
    }
    return question;
  }

  async delete(question: Question): Promise<void> {
    await this.repository.delete({ id: question.id });
  }
}
