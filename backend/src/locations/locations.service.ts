import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  async findAll(): Promise<{ id: string; name: string }[]> {
    const locations = await this.locationRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return locations.map((l) => ({ id: l.id, name: l.name }));
  }
}
