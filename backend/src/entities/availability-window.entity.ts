import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('availability_windows')
export class AvailabilityWindow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'day_of_week', type: 'integer', nullable: true })
  dayOfWeek: number | null;

  @Column({ name: 'start_time', type: 'varchar' })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar' })
  endTime: string;

  @Column({ name: 'location_timezone', type: 'varchar' })
  locationTimezone: string;

  @Column({ name: 'is_recurring', type: 'boolean' })
  isRecurring: boolean;

  @Column({ name: 'exception_date', type: 'date', nullable: true })
  exceptionDate: Date | null;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
