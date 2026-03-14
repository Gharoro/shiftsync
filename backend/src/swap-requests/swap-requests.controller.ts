import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../entities/user.entity';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { RespondSwapRequestDto } from './dto/respond-swap-request.dto';
import { ManagerDecisionDto } from './dto/manager-decision.dto';
import { ClaimDropDto } from './dto/claim-drop.dto';
import { SwapRequestResponseDto } from './dto/swap-request-response.dto';
import { SwapRequestsService } from './swap-requests.service';

@Controller({ path: 'swap-requests', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SwapRequestsController {
  constructor(private readonly swapRequestsService: SwapRequestsService) {}

  @Post()
  @Roles(UserRole.STAFF)
  create(
    @Body() dto: CreateSwapRequestDto,
    @CurrentUser() user: User,
  ): Promise<SwapRequestResponseDto> {
    return this.swapRequestsService.createSwapRequest(dto, user);
  }

  @Post('claim')
  @Roles(UserRole.STAFF)
  claimDrop(
    @Body() dto: ClaimDropDto,
    @CurrentUser() user: User,
  ): Promise<SwapRequestResponseDto> {
    return this.swapRequestsService.claimDrop(dto, user);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findPending(@CurrentUser() user: User): Promise<SwapRequestResponseDto[]> {
    return this.swapRequestsService.findPending(user);
  }

  @Get('drops')
  @Roles(UserRole.STAFF)
  findAvailableDrops(
    @CurrentUser() user: User,
  ): Promise<SwapRequestResponseDto[]> {
    return this.swapRequestsService.findAvailableDrops(user);
  }

  @Post(':id/respond')
  @Roles(UserRole.STAFF)
  respond(
    @Param('id') id: string,
    @Body() dto: RespondSwapRequestDto,
    @CurrentUser() user: User,
  ): Promise<SwapRequestResponseDto> {
    return this.swapRequestsService.respondToSwap(id, dto, user);
  }

  @Post(':id/decision')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  managerDecision(
    @Param('id') id: string,
    @Body() dto: ManagerDecisionDto,
    @CurrentUser() user: User,
  ): Promise<SwapRequestResponseDto> {
    return this.swapRequestsService.managerDecision(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.STAFF)
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<SwapRequestResponseDto> {
    return this.swapRequestsService.cancelSwapRequest(id, user);
  }
}
