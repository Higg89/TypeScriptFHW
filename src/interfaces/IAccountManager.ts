import { IAccount } from './IAccount';

export interface IAccountManager {
  getAccounts(): IAccount[];
  getAccountById(id: string): IAccount | undefined;
  addAccount(account: IAccount): void;
  removeAccount(id: string): void;
  setAccounts(accounts: IAccount[]): void;
}

