import { Column } from 'typeorm';

export class PasswordRecovery {
  @Column({ name: 'recovery_code', type: 'uuid', nullable: true })
  recoveryCode: string | null;
  @Column({ name: 'recovery_expiration', type: 'timestamptz', nullable: true })
  expirationDate: Date | null;
}
