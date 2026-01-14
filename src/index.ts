import { ApplicationController } from './classes/ApplicationController';
import { Account } from './classes/Account';
import { Transaction } from './classes/Transaction';

function setInitialState(controller: ApplicationController): void {
  const personalAccount = new Account('Личный бюджет');
  personalAccount.addTransaction(
    new Transaction(1000, 'income', '2026-01-01T00:00:00Z', 'Зарплата')
  );
  personalAccount.addTransaction(
    new Transaction(200, 'expense', '2026-01-05T00:00:00Z', 'Продукты')
  );
  personalAccount.addTransaction(
    new Transaction(150, 'expense', '2026-01-09T00:00:00Z', 'Коммунальные услуги')
  );
  controller.accountManager.addAccount(personalAccount);

  const vacationAccount = new Account('Копилка на отпуск');
  vacationAccount.addTransaction(
    new Transaction(500, 'income', '2026-04-01T00:00:00Z', 'Премия')
  );
  vacationAccount.addTransaction(
    new Transaction(600, 'income', '2026-01-01T00:00:00Z', 'Возврат долга')
  );
  vacationAccount.addTransaction(
    new Transaction(300, 'expense', '2026-01-05T00:00:00Z', 'Билеты на самолёт')
  );
  vacationAccount.addTransaction(
    new Transaction(200, 'expense', '2026-01-09T00:00:00Z', 'Номер в отеле')
  );
  controller.accountManager.addAccount(vacationAccount);
}

async function main(): Promise<void> {
  const controller = new ApplicationController();

  await controller.loadState();
  
  if (controller.accountManager.getAccounts().length === 0) {
    setInitialState(controller);
    await controller.saveState();
  }
  
  await controller.start();
}

main();
