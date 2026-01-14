import { AccountManager } from './AccountManager';
import { Account } from './Account';
import { Transaction } from './Transaction';
import { TransactionType } from '../interfaces/TransactionType';
import { escapeCsvValue } from '../utils/escapeCsvValue';
import * as fs from 'fs';
import * as path from 'path';

type InquirerPrompt = (questions: ReadonlyArray<unknown>) => Promise<Record<string, unknown>>;
type InquirerModule = {
  prompt: InquirerPrompt;
};

export class ApplicationController {
  public readonly accountManager: AccountManager;
  private readonly dataFilePath: string;

  constructor() {
    this.accountManager = new AccountManager();
    this.dataFilePath = path.resolve(process.cwd(), 'budget-data.json');
  }

  private async getInquirer(): Promise<InquirerModule> {
    const mod = await import('inquirer');
    const candidate =
      (mod as unknown as { default?: InquirerModule }).default ?? (mod as unknown as InquirerModule);
    return candidate;
  }

  public async start(): Promise<void> {
    while (true) {
      console.clear();
      const inquirer = await this.getInquirer();
      const accounts = this.accountManager.getAccounts();

      console.log('=== Список счетов ===\n');
      if (accounts.length === 0) {
        console.log('Пока нет ни одного счёта.\n');
      } else {
        accounts.forEach((acc, idx) => {
          console.log(`${idx + 1}. ${acc.toString()}`);
        });
        console.log();
      }

      const choices = [
        ...(accounts.length > 0
          ? accounts.map((acc: Account) => ({
              name: acc.toString(),
              value: acc.id,
            }))
          : []),
        { name: 'Создать новый счёт', value: 'create' },
        { name: 'Выход', value: 'exit' },
      ];

      const { action } = (await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Выберите счёт или действие:',
          choices,
        },
      ])) as { action: string };

      if (action === 'create') {
        await this.createAccount();
      } else if (action === 'exit') {
        await this.saveState();
        console.log('\nДо свидания!');
        break;
      } else {
        await this.watchAccount(action);
      }
    }
  }

  public async createAccount(): Promise<void> {
    const inquirer = await this.getInquirer();
    console.clear();
    const { name } = (await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Введите название нового счёта:',
        validate: (input: string) => (input.trim().length === 0 ? 'Название не может быть пустым' : true),
      },
    ])) as { name: string };

    const account = new Account(name.trim());
    this.accountManager.addAccount(account);
    await this.saveState();
  }

  public async loadState(): Promise<void> {
    if (!fs.existsSync(this.dataFilePath)) {
      return;
    }

    try {
      const raw = fs.readFileSync(this.dataFilePath, { encoding: 'utf8' });
      if (!raw.trim()) {
        return;
      }

      const parsed = JSON.parse(raw) as {
        accounts?: {
          name: string;
          transactions?: {
            amount: number;
            type: TransactionType;
            date: string;
            description: string;
          }[];
        }[];
      };

      const loadedAccounts: Account[] = [];
      if (parsed.accounts && Array.isArray(parsed.accounts)) {
        for (const accData of parsed.accounts) {
          const acc = new Account(accData.name);
          if (accData.transactions && Array.isArray(accData.transactions)) {
            for (const t of accData.transactions) {
              acc.addTransaction(
                new Transaction(t.amount, t.type, t.date, t.description)
              );
            }
          }
          loadedAccounts.push(acc);
        }
      }

      if (loadedAccounts.length > 0) {
        this.accountManager.setAccounts(loadedAccounts);
      }
    } catch (err) {
      console.error('Не удалось загрузить данные из файла:', err);
    }
  }

  public async saveState(): Promise<void> {
    const accounts = this.accountManager.getAccounts();
    const plain = accounts.map((acc) => ({
      name: acc.name,
      transactions: acc.transactions.map((t) => ({
        amount: t.amount,
        type: t.type,
        date: t.date,
        description: t.description,
      })),
    }));

    const data = { accounts: plain };

    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2), {
        encoding: 'utf8',
      });
    } catch (err) {
      console.error('Не удалось сохранить данные в файл:', err);
    }
  }

  public async watchAccount(accountId: string): Promise<void> {
    const inquirer = await this.getInquirer();
    const account = this.accountManager.getAccountById(accountId);
    if (!account) {
      console.log('Счёт не найден.');
      await inquirer.prompt([{ type: 'input', name: 'pause', message: 'Нажмите Enter, чтобы вернуться.' }]);
      return;
    }

    while (true) {
      console.clear();
      console.log('=== Счёт ===\n');
      console.log(account.getSummaryString());
      console.log('\nТранзакции:\n');

      if (account.transactions.length === 0) {
        console.log('Нет транзакций.\n');
      } else {
        account.transactions.forEach((t) => {
          console.log(t.toString());
        });
        console.log();
      }

      const { action } = (await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Выберите действие:',
          choices: [
            { name: 'Добавить транзакцию', value: 'add' },
            { name: 'Удалить транзакцию', value: 'remove-transaction' },
            { name: 'Экспортировать в CSV', value: 'export' },
            { name: 'Удалить счёт', value: 'remove-account' },
            { name: 'Вернуться к списку счетов', value: 'back' },
          ],
        },
      ])) as { action: string };

      if (action === 'add') {
        await this.addTransaction(account.id);
      } else if (action === 'remove-transaction') {
        await this.removeTransaction(account.id);
      } else if (action === 'export') {
        await this.exportTransactionsToCSV(account.id);
      } else if (action === 'remove-account') {
        const removed = await this.removeAccount(account.id);
        if (removed) {
          return;
        }
      } else if (action === 'back') {
        return;
      }
    }
  }

  public async removeAccount(accountId: string): Promise<boolean> {
    const inquirer = await this.getInquirer();
    const account = this.accountManager.getAccountById(accountId);
    if (!account) {
      console.log('Счёт не найден.');
      await inquirer.prompt([{ type: 'input', name: 'pause', message: 'Нажмите Enter, чтобы вернуться.' }]);
      return false;
    }

    const { confirm } = (await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Удалить счёт "${account.name}" и все его транзакции?`,
        default: false,
      },
    ])) as { confirm: boolean };

    if (confirm) {
      this.accountManager.removeAccount(accountId);
      console.log('Счёт удалён.');
      await this.saveState();
      await inquirer.prompt([{ type: 'input', name: 'pause', message: 'Нажмите Enter, чтобы продолжить.' }]);
      return true;
    }

    return false;
  }

  public async addTransaction(accountId: string): Promise<void> {
    const inquirer = await this.getInquirer();
    const account = this.accountManager.getAccountById(accountId);
    if (!account) {
      console.log('Счёт не найден.');
      await inquirer.prompt([{ type: 'input', name: 'pause', message: 'Нажмите Enter, чтобы вернуться.' }]);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    const answers = (await inquirer.prompt([
      {
        type: 'input',
        name: 'amount',
        message: 'Сумма транзакции (больше 0):',
        validate: (input: string) => {
          const value = Number(input.replace(',', '.'));
          if (Number.isNaN(value) || value <= 0) {
            return 'Введите корректное число больше 0';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'type',
        message: 'Тип транзакции:',
        choices: [
          { name: 'Доход', value: 'income' },
          { name: 'Расход', value: 'expense' },
        ],
      },
      {
        type: 'input',
        name: 'date',
        message: `Дата транзакции (YYYY-MM-DD, по умолчанию ${today}):`,
        default: today,
        validate: (input: string) => {
          if (!input) {
            return true;
          }
          const isValid = /^\d{4}-\d{2}-\d{2}$/.test(input);
          return isValid ? true : 'Введите дату в формате YYYY-MM-DD';
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Описание транзакции:',
        default: '',
      },
    ])) as {
      amount: string;
      type: TransactionType;
      date: string;
      description: string;
    };

    const amount = Number(answers.amount.replace(',', '.'));
    const isoDate = new Date(answers.date || today).toISOString();

    const transaction = new Transaction(amount, answers.type, isoDate, answers.description.trim());
    account.addTransaction(transaction);
    await this.saveState();
  }

  public async removeTransaction(accountId: string): Promise<void> {
    const inquirer = await this.getInquirer();
    const account = this.accountManager.getAccountById(accountId);
    if (!account) {
      console.log('Счёт не найден.');
      await inquirer.prompt([{ type: 'input', name: 'pause', message: 'Нажмите Enter, чтобы вернуться.' }]);
      return;
    }

    if (account.transactions.length === 0) {
      console.log('Нет транзакций для удаления.');
      await inquirer.prompt([{ type: 'input', name: 'pause', message: 'Нажмите Enter, чтобы вернуться.' }]);
      return;
    }

    const { transactionId } = (await inquirer.prompt([
      {
        type: 'list',
        name: 'transactionId',
        message: 'Выберите транзакцию для удаления:',
        choices: account.transactions.map((t) => ({
          name: t.toString(),
          value: t.id,
        })),
      },
    ])) as { transactionId: string };

    const { confirm } = (await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Вы уверены, что хотите удалить эту транзакцию?',
        default: false,
      },
    ])) as { confirm: boolean };

    if (confirm) {
      account.removeTransaction(transactionId);
      console.log('Транзакция удалена.');
      await this.saveState();
      await inquirer.prompt([{ type: 'input', name: 'pause', message: 'Нажмите Enter, чтобы продолжить.' }]);
    }
  }

  public async exportTransactionsToCSV(accountId: string): Promise<void> {
    const inquirer = await this.getInquirer();
    const account = this.accountManager.getAccountById(accountId);
    if (!account) {
      console.log('Счёт не найден.');
      await inquirer.prompt([{ type: 'input', name: 'pause', message: 'Нажмите Enter, чтобы вернуться.' }]);
      return;
    }

    if (account.transactions.length === 0) {
      console.log('Нет транзакций для экспорта.');
      await inquirer.prompt([{ type: 'input', name: 'pause', message: 'Нажмите Enter, чтобы вернуться.' }]);
      return;
    }

    const { fileName } = (await inquirer.prompt([
      {
        type: 'input',
        name: 'fileName',
        message: 'Введите имя файла (без расширения):',
        validate: (input: string) => (input.trim().length === 0 ? 'Имя файла не может быть пустым' : true),
      },
    ])) as { fileName: string };

    const safeName = fileName.trim();
    const filePath = path.resolve(process.cwd(), `${safeName}.csv`);

    const delimiter = ';';
    const header = ['id', 'amount', 'type', 'date', 'description'];
    const lines: string[] = [header.join(delimiter)];

    for (const t of account.transactions) {
      const row = [
        escapeCsvValue(t.id),
        escapeCsvValue(t.amount.toString()),
        escapeCsvValue(t.type),
        escapeCsvValue(t.date),
        escapeCsvValue(t.description),
      ];
      lines.push(row.join(delimiter));
    }

    try {
      const content = lines.join('\r\n');
      const withBom = `\uFEFF${content}`;
      fs.writeFileSync(filePath, withBom, { encoding: 'utf8' });
      console.log(`Транзакции экспортированы в файл: ${filePath}`);
    } catch (err) {
      console.error('Ошибка при экспорте в CSV:', err);
    }

    await inquirer.prompt([{ type: 'input', name: 'pause', message: 'Нажмите Enter, чтобы вернуться.' }]);
  }
}

