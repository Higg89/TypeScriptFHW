import { ITransaction } from '../interfaces/ITransaction';
import { TransactionType } from '../interfaces/TransactionType';

let transactionCounter = 1;

export class Transaction implements ITransaction {
  public readonly id: string;

  constructor(
    public amount: number,
    public type: TransactionType,
    public date: string,
    public description: string
  ) {
    this.id = `t-${transactionCounter++}`;
  }

  toString(): string {
    const shortId = this.id;
    const sign = this.type === 'income' ? '+' : '-';
    return `${shortId} | ${this.date} | ${sign}${this.amount.toFixed(2)} | ${this.description}`;
  }
}

