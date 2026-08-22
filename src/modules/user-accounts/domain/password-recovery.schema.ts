import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

//вложенная схема восстановления пароля
@Schema({
  _id: false,
})
export class PasswordRecovery {
  /**
   * Код восстановления пароля из письма (null, если восстановление не запрашивалось)
   */
  @Prop({ type: String, nullable: true, default: null })
  recoveryCode: string | null;

  /**
   * Срок жизни кода восстановления
   */
  @Prop({ type: Date, nullable: true, default: null })
  expirationDate: Date | null;
}

export const PasswordRecoverySchema =
  SchemaFactory.createForClass(PasswordRecovery);
