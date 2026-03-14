import { IsEnum } from 'class-validator';
import { SwapRequestRespondAction } from '../../common/enums/swap-request-respond-action.enum';

export class RespondSwapRequestDto {
  @IsEnum(SwapRequestRespondAction)
  action: SwapRequestRespondAction;
}
