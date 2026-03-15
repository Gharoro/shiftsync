import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from '../entities/location.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { LocationCertification } from '../entities/location-certification.entity';
import { LocationGuard } from '../common/guards/location.guard';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Location,
      ManagerLocation,
      LocationCertification,
    ]),
  ],
  controllers: [LocationsController],
  providers: [LocationGuard, LocationsService],
  exports: [TypeOrmModule, LocationGuard],
})
export class LocationsModule {}
