import { User } from './user.entity';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MasterEntity } from './master.entity';

@Module({
  imports: [
    AzureCosmosDbModule.forFeature([
      {
        collection: 'User',
        dto: User,
      },
      {
        collection: 'master',
        dto: MasterEntity,
      },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
