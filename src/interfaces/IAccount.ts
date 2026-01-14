import { ITransaction } from './ITransaction';
import { ISummary } from './ISummary';

export interface IAccount {
  id: string;
  name: string;
  transactions: ITransaction[];

  addTransaction(transaction: ITransaction): void;
  removeTransaction(transactionId: string): void;
  getSummary(): ISummary;
  getSummaryString(): string;
}

