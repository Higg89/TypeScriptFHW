import { IAccountManager } from '../interfaces/IAccountManager';
import { IAccount } from '../interfaces/IAccount';

export class AccountManager implements IAccountManager {
  private accounts: IAccount[] = [];

  getAccounts(): IAccount[] {
    return this.accounts;
  }

  getAccountById(id: string): IAccount | undefined {
    return this.accounts.find((a) => a.id === id);
  }

  addAccount(account: IAccount): void {
    this.accounts.push(account);
  }

  removeAccount(id: string): void {
    this.accounts = this.accounts.filter((a) => a.id !== id);
  }
}

