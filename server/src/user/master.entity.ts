import { CosmosPartitionKey } from '@nestjs/azure-database';

@CosmosPartitionKey('master_id')
export class MasterEntity {
  id: string; // Unique identifier for the target group
  master_id: string;
  Role: roleData[];
  Languages: languagesData[];
}

class roleData {
  code: string;
  name: string;
  access: string[];
}

class languagesData {
  name: string;
  code: string;
}
