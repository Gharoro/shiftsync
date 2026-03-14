import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from '../entities/skill.entity';
import { StaffSkill } from '../entities/staff-skill.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, StaffSkill])],
  exports: [TypeOrmModule],
})
export class SkillsModule {}
