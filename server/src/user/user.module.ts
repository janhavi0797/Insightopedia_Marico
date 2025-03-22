import { User } from './user.entity';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
    imports:[AzureCosmosDbModule.forFeature([
        {
        collection:'User',
        dto: User
        }

])],
    controllers: [UserController],
    providers:[UserService]
})
export class UserModule {}


