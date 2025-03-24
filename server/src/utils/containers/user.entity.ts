import { CosmosPartitionKey } from '@nestjs/azure-database';

@CosmosPartitionKey('userid')
export class User {
  id: string;
  userid: string;
  userName: string;
  email: string;
  rolecode: string;
  mapUser: string[];
}
