//src/user/user.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { User } from './user.entity';
import { IUserDto, IUserEditDto } from './dto/user.dto';
import { MasterEntity } from './master.entity';
import { plainToInstance } from 'class-transformer';
import { CreateMasterDto } from './dto/master.dto';

@Injectable()
export class UserService {
  createUser() //payload: IUserDto,
  :
    | { response: number; message: string }
    | PromiseLike<{ response: number; message: string }> {
    throw new Error('Method not implemented.');
  }

  constructor(
    @InjectModel(User) private readonly userContainer: Container,
    @InjectModel(MasterEntity) private readonly masterContainer: Container,
  ) {}

  // Create new user using stored procedure
  async createUserWithSP(payload: IUserDto): Promise<{
    response: number;
    message: string;
    user?: User;
    existingUser?: User;
  }> {
    try {
      // Validate payload (optional)
      if (!payload || !payload.userid || !payload.email) {
        throw new HttpException(
          {
            message: 'Invalid input data',
            error: 'User ID and Email are required.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const sprocId = 'createUser'; // Stored procedure ID
      const partitionKey = payload.userid; // Set partition key based on the user ID
      console.log('30');
      // Call the stored procedure with the correct partition key
      const { resource: result } = await this.userContainer.scripts
        .storedProcedure(sprocId)
        .execute(partitionKey, [payload]);

      // Check if result is valid and return the response
      if (result) {
        return {
          response: result.response,
          message: result.message,
          user: result.user,
          existingUser: result.existingUser,
        };
      } else {
        throw new HttpException(
          { message: 'Stored procedure did not return a valid result' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      throw new HttpException(
        { message: 'Error creating user', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllUsers(userId?: string): Promise<User[]> {
    try {
      // Case 1: If no userId is provided, return all users
      if (!userId) {
        const querySpec = { query: `SELECT * FROM c` };
        const { resources: allUsers } = await this.userContainer.items
          .query(querySpec)
          .fetchAll();
        return allUsers;
      }

      // Case 2: If userId is provided, fetch the user and their mapped users
      const userQuerySpec = {
        query: `SELECT * FROM c WHERE c.userid = @userId`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: userResults } = await this.userContainer.items
        .query(userQuerySpec)
        .fetchAll();

      if (!userResults || userResults.length === 0) {
        throw new Error(`User with userId ${userId} not found.`);
      }

      const currentUser = userResults[0];

      if (!currentUser.mapUser || currentUser.mapUser.length === 0) {
        return []; // Return empty array if no mapped users are found
      }

      // Fetch users from mapUser array
      const mappedUserQuerySpec = {
        query: `SELECT * FROM c WHERE ARRAY_CONTAINS(@mappedUserIds, c.userid)`,
        parameters: [{ name: '@mappedUserIds', value: currentUser.mapUser }],
      };

      const { resources: mappedUsers } = await this.userContainer.items
        .query(mappedUserQuerySpec)
        .fetchAll();
      return mappedUsers;
    } catch (error) {
      console.error('Error fetching users:', error.message);
      throw new Error('Failed to fetch users');
    }
  }

  async editUser(
    payload: IUserEditDto,
  ): Promise<{ response: number; message: string; updatedUser?: User }> {
    try {
      // Step 1: Validate payload (Ensure required fields are provided)
      if (!payload || !payload.email) {
        throw new HttpException(
          {
            message: 'Invalid input data',
            error: 'Email is required for user update.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Step 2: Fetch the user based on email (assuming email is unique)
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: payload.email }],
      };

      const { resources: existingUsers } = await this.userContainer.items
        .query(querySpec)
        .fetchAll();
      // Step 3: Handle case when user is not found
      if (!existingUsers || existingUsers.length === 0) {
        throw new HttpException(
          {
            message: 'User not found',
            error: `No user found with email ${payload.email}`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const existingUser = existingUsers[0]; // Assuming email is unique
      // Step 4: Update only provided fields (Preserve existing values)
      existingUser.userName = payload.name || existingUser.userName;
      existingUser.email = payload.email || existingUser.email;
      existingUser.rolecode = payload.role || existingUser.rolecode;
      existingUser.mapUser = payload.mapUser;

      // Step 5: Upsert the updated user back into CosmosDB
      // const { resource: updatedUser } =
      //   await this.userContainer.items.upsert(existingUser);

      return {
        response: 1, // Success flag
        message: payload.name + ' updated successfully',
      };
    } catch (error) {
      console.error('Error updating user:', error.message);

      throw new HttpException(
        { message: 'Error updating user', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Master Data

  async getMasterData() {
    try {
      const querySpec = {
        query: `SELECT * FROM c`,
      };

      const { resources: masters } = await this.masterContainer.items
        .query(querySpec)
        .fetchAll();

      if (!masters || masters.length === 0) {
        return {
          statusCode: 404,
          message: 'No master data found',
          data: [],
        };
      }

      const transformedMasters = masters.map(
        ({ id, master_id, Role, Languages }) =>
          plainToInstance(CreateMasterDto, {
            id,
            master_id,
            role:
              Role?.map(({ code, name, access }) => ({ code, name, access })) ||
              [],
            languages:
              Languages?.map(({ name, code }) => ({ name, code })) || [],
          }),
      );
      return {
        statusCode: 200,
        message: 'Master data retrieved successfully',
        data: transformedMasters,
      };
    } catch (error) {
      console.error('Error fetching master data:', error);
      return {
        statusCode: 500,
        message: 'Failed to fetch master data',
        data: [],
      };
    }
  }
}
