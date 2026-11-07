import { Column } from 'typeorm';

export class Name {
  @Column({ name: 'first_name', type: 'varchar', nullable: true, length: 50 })
  firstName: string | null;
  @Column({ name: 'last_name', type: 'varchar', nullable: true, length: 50 })
  lastName: string | null;
}
