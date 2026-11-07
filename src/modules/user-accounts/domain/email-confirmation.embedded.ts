import { Column } from 'typeorm';

export class EmailConfirmation {
  @Column({ name: 'confirmation_code', type: 'uuid', nullable: true })
  confirmationCode: string | null;
  @Column({
    name: 'confirmation_expiration',
    type: 'timestamptz',
    nullable: true,
  })
  expirationDate: Date | null;
  @Column({ name: 'is_confirmed', type: 'boolean', default: false })
  isConfirmed: boolean;
}
