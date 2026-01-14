import { IAccount } from '../interfaces/IAccount';
import { ITransaction } from '../interfaces/ITransaction';
import { ISummary } from '../interfaces/ISummary';

let accountCounter = 1;

export class Account implements IAccount {
  public readonly id: string;
  public transactions: ITransaction[] = [];

  constructor(public name: string) {
    this.id = `a-${accountCounter++}`;
  }

  addTransaction(transaction: ITransaction): void {
    this.transactions.push(transaction);
  }

  removeTransaction(transactionId: string): void {
    this.transactions = this.transactions.filter((t) => t.id !== transactionId);
  }

  getSummary(): ISummary {
    let totalIncome = 0;
    let totalExpense = 0;

    for (const t of this.transactions) {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    }

    return {
      balance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
    };
  }

  getSummaryString(): string {
    const { balance, totalIncome, totalExpense } = this.getSummary();
    return `Счёт: ${this.name}\nБаланс: ${balance.toFixed(2)}\nДоходы: ${totalIncome.toFixed(
      2
    )}\nРасходы: ${totalExpense.toFixed(2)}`;
  }

  toString(): string {
    const { balance } = this.getSummary();
    return `${this.name} (баланс: ${balance.toFixed(2)})`;
  }
}

