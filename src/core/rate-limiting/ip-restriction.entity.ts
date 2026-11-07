import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ip_restrictions')
export class IpRestriction {
  // Nest hashes the IP, controller, handler and throttler name into this key.
  @PrimaryColumn({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  hits: number[];
}
