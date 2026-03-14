import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityWindow } from '../entities/availability-window.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AvailabilityWindow])],
  exports: [TypeOrmModule],
})
export class AvailabilityModule {}
