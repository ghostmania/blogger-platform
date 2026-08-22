import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

//вложенная схема статуса подтверждения email
@Schema({
  _id: false,
})
export class EmailConfirmation {
  /**
   * Код подтверждения, отправляемый на email (null, если код ещё не генерировался)
   */
  @Prop({ type: String, nullable: true, default: null })
  confirmationCode: string | null;

  /**
   * Срок жизни кода подтверждения
   */
  @Prop({ type: Date, nullable: true, default: null })
  expirationDate: Date | null;

  /**
   * Подтверждён ли email
   */
  @Prop({ type: Boolean, required: true, default: false })
  isConfirmed: boolean;
}

export const EmailConfirmationSchema =
  SchemaFactory.createForClass(EmailConfirmation);
