import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../../core/database/database.constants';
import {
  UserSqlEntity,
  UserRow,
} from '../../domain/sql/user.sql-entity';
import { CreateUserDomainDto } from '../../domain/dto/create-user.domain.dto';
import { UsersRepository } from '../users.repository.abstract';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

//читаем всегда одни и те же колонки — сущность собирается из полной строки
const USER_COLUMNS = `
  id, login, email, password_hash,
  confirmation_code, confirmation_expiration, is_confirmed,
  recovery_code, recovery_expiration,
  first_name, last_name,
  created_at, updated_at, deleted_at
`;

//id — bigserial. Строка вроде ObjectId (её пропускает IdValidationPipe,
//потому что контроллер общий для обеих реализаций) уронила бы запрос
//ошибкой 22P02, поэтому формат проверяем до обращения к БД
const NUMERIC_ID = /^\d+$/;

//коды подтверждения и восстановления генерируются через randomUUID()
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PostgreSQL-реализация контракта UsersRepository (сырой SQL, без ORM).
 *
 * Что изменилось по сравнению с UsersMongoRepository:
 *  - запросы — строки SQL с параметрами $1 вместо объектов-фильтров;
 *  - нет change detection: save() сам решает, INSERT это или UPDATE, и в UPDATE
 *    переписывает все колонки (мангуст умел отслеживать изменённые поля сам);
 *  - вложенные emailConfirmation/passwordRecovery/name раскладываются
 *    по плоским колонкам и собираются обратно в UserSqlEntity.fromRow().
 */
@Injectable()
export class UsersSqlRepository extends UsersRepository {
  constructor(@Inject(PG_POOL) private pool: Pool) {
    super();
  }

  createInstance(dto: CreateUserDomainDto): UserSqlEntity {
    return UserSqlEntity.createInstance(dto);
  }

  /**
   * Заменяет change detection мангуста: пустой id означает, что сущности
   * ещё нет в БД.
   */
  async save(user: UserSqlEntity): Promise<void> {
    if (!user.id) {
      const { rows } = await this.pool.query<{
        id: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO users (
           login, email, password_hash,
           confirmation_code, confirmation_expiration, is_confirmed,
           recovery_code, recovery_expiration,
           first_name, last_name
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, created_at, updated_at`,
        [
          user.login,
          user.email,
          user.passwordHash,
          user.emailConfirmation.confirmationCode,
          user.emailConfirmation.expirationDate,
          user.emailConfirmation.isConfirmed,
          user.passwordRecovery.recoveryCode,
          user.passwordRecovery.expirationDate,
          user.name.firstName,
          user.name.lastName,
        ],
      );

      user.id = rows[0].id;
      user.createdAt = rows[0].created_at;
      user.updatedAt = rows[0].updated_at;

      return;
    }

    await this.pool.query(
      `UPDATE users
       SET login = $2,
           email = $3,
           password_hash = $4,
           confirmation_code = $5,
           confirmation_expiration = $6,
           is_confirmed = $7,
           recovery_code = $8,
           recovery_expiration = $9,
           first_name = $10,
           last_name = $11,
           deleted_at = $12,
           updated_at = now()
       WHERE id = $1`,
      [
        user.id,
        user.login,
        user.email,
        user.passwordHash,
        user.emailConfirmation.confirmationCode,
        user.emailConfirmation.expirationDate,
        user.emailConfirmation.isConfirmed,
        user.passwordRecovery.recoveryCode,
        user.passwordRecovery.expirationDate,
        user.name.firstName,
        user.name.lastName,
        user.deletedAt,
      ],
    );
  }

  findById(id: string): Promise<UserSqlEntity | null> {
    //«id неверного формата» — это тот же «такого юзера нет», то есть null:
    //дальше findOrNotFoundFail превратит его в честный 404, а не в 500
    if (!NUMERIC_ID.test(id)) {
      return Promise.resolve(null);
    }

    return this.findOneBy('id = $1', [id]);
  }

  async findOrNotFoundFail(id: string): Promise<UserSqlEntity> {
    const user = await this.findById(id);

    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'User not found',
      });
    }

    return user;
  }

  findByLogin(login: string): Promise<UserSqlEntity | null> {
    return this.findOneBy('login = $1', [login]);
  }

  findByEmail(email: string): Promise<UserSqlEntity | null> {
    return this.findOneBy('email = $1', [email]);
  }

  findByLoginOrEmail(loginOrEmail: string): Promise<UserSqlEntity | null> {
    return this.findOneBy('(login = $1 OR email = $1)', [loginOrEmail]);
  }

  findByConfirmationCode(code: string): Promise<UserSqlEntity | null> {
    return this.findOneByUuidCode('confirmation_code', code);
  }

  findByPasswordRecoveryCode(code: string): Promise<UserSqlEntity | null> {
    return this.findOneByUuidCode('recovery_code', code);
  }

  /**
   * Коды из писем лежат в колонках типа uuid, а из тела запроса может прийти
   * что угодно. Postgres на таком падает с 22P02, поэтому формат проверяем
   * заранее: «код неверного формата» — это тот же «кода нет», то есть null.
   * В монго этой проблемы не было: там код хранился строкой.
   */
  private findOneByUuidCode(
    column: 'confirmation_code' | 'recovery_code',
    code: string,
  ): Promise<UserSqlEntity | null> {
    if (!UUID_PATTERN.test(code)) {
      return Promise.resolve(null);
    }

    return this.findOneBy(`${column} = $1`, [code]);
  }

  /**
   * Общая часть всех выборок. condition — ТОЛЬКО литералы из этого файла,
   * данные снаружи приходят исключительно через params.
   * Soft-deleted юзеров не отдаём нигде.
   */
  private async findOneBy(
    condition: string,
    params: unknown[],
  ): Promise<UserSqlEntity | null> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT ${USER_COLUMNS}
       FROM users
       WHERE ${condition} AND deleted_at IS NULL
       LIMIT 1`,
      params,
    );

    return rows.length ? UserSqlEntity.fromRow(rows[0]) : null;
  }
}
