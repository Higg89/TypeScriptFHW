import { TransactionType } from './TransactionType';

export interface ITransaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: string;
  description: string;
}

