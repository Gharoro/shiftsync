import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from '../entities/skill.entity';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
  ) {}

  async findAll(): Promise<{ id: string; name: string }[]> {
    const skills = await this.skillRepository.find({
      order: { name: 'ASC' },
    });
    return skills.map((s) => ({ id: s.id, name: s.name }));
  }
}
