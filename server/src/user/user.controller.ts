import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { IUserDto, IUserEditDto } from './dto/user.dto';
//import { User } from '@azure/cosmos';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('User Management')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create') // This sets the route to /users/create
  @ApiOperation({ summary: 'Create a new user' }) // Provides a description in Swagger
  @ApiBody({ type: IUserDto }) // Specifies the input type
  async createUser(@Body() payload: IUserDto) {
    return await this.userService.createUserWithSP(payload);
  }
  @Get('all') // GET /users/all
  @ApiOperation({ summary: 'Get all users' })
  async getAllUsers(@Query('userId') userId?: string) {
    console.log(userId);
    return await this.userService.getAllUsers(userId);
  }

  @Post('edit')
  async editUser(@Body() payload: IUserEditDto) {
    return await this.userService.editUser(payload);
  }

  // Master
  @Get('masterData')
  async getAllMasterData() {
    return this.userService.getMasterData();
  }
}
