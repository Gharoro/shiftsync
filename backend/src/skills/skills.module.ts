import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from '../entities/skill.entity';
import { StaffSkill } from '../entities/staff-skill.entity';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, StaffSkill])],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [TypeOrmModule],
})
export class SkillsModule {}
