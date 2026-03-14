import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ManagerDecisionAction } from '../../common/enums/manager-decision-action.enum';

export class ManagerDecisionDto {
  @IsEnum(ManagerDecisionAction)
  action: ManagerDecisionAction;

  @IsOptional()
  @IsString()
  rejection_reason?: string;

  @IsOptional()
  @IsString()
  override_reason?: string;
}
