import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CreateQuestionDomainDto } from './dto/create-question.domain.dto';
import { UpdateQuestionDomainDto } from './dto/update-question.domain.dto';

//Entity поверх таблицы quiz_questions из init.sql; synchronize выключен
@Entity('quiz_questions')
export class Question {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;
  @Column({ type: 'varchar', length: 500 })
  body: string;
  @Column({ name: 'correct_answers', type: 'jsonb' })
  correctAnswers: string[];
  @Column({ type: 'boolean', default: false })
  published: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  //null до первого изменения, поэтому не @UpdateDateColumn
  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;

  static createInstance(dto: CreateQuestionDomainDto): Question {
    const question = new this();
    question.body = dto.body;
    question.correctAnswers = dto.correctAnswers;
    question.published = false;
    question.updatedAt = null;
    return question;
  }

  update(dto: UpdateQuestionDomainDto): void {
    this.body = dto.body;
    this.correctAnswers = dto.correctAnswers;
    this.updatedAt = new Date();
  }

  publish(published: boolean): void {
    this.published = published;
    this.updatedAt = new Date();
  }
}
