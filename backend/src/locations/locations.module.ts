import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from '../entities/location.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { LocationCertification } from '../entities/location-certification.entity';
import { LocationGuard } from '../common/guards/location.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Location,
      ManagerLocation,
      LocationCertification,
    ]),
  ],
  providers: [LocationGuard],
  exports: [TypeOrmModule, LocationGuard],
})
export class LocationsModule {}
