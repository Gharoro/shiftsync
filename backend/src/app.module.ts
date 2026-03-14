import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LocationsModule } from './locations/locations.module';
import { SkillsModule } from './skills/skills.module';
import { ShiftsModule } from './shifts/shifts.module';
import { AvailabilityModule } from './availability/availability.module';
import { SwapRequestsModule } from './swap-requests/swap-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { SettingsModule } from './settings/settings.module';
import { SchedulingValidationModule } from './scheduling-validation/scheduling-validation.module';
import { OverTimeModule } from './overtime/overtime.module';
import { FairnessModule } from './fairness/fairness.module';
import { RealtimeModule } from './realtime/realtime.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.string().optional(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.string().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        DB_SYNCHRONIZE: Joi.string().valid('true', 'false').required(),
        DB_LOGGING: Joi.string().valid('true', 'false').required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        API_PREFIX: Joi.string().required(),
        API_VERSION: Joi.string().required(),
      }),
      validationOptions: {
        allowUnknown: true,
      },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        synchronize: false,
        logging: configService.get<boolean>('database.logging'),
        autoLoadEntities: true,
        migrations: ['dist/migrations/*.js'],
        migrationsRun: true,
        ssl: true,
      }),
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    LocationsModule,
    SkillsModule,
    ShiftsModule,
    AvailabilityModule,
    SwapRequestsModule,
    NotificationsModule,
    AuditLogModule,
    SettingsModule,
    SchedulingValidationModule,
    OverTimeModule,
    FairnessModule,
    RealtimeModule,
  ],
})
export class AppModule {}
