import { ipcMain } from 'electron'
import type { GetTransactionDetailInput, TransactionLedgerQuery, UpdateTransactionInput } from '../../shared/contracts/transactions'
import { getWalnutRepository } from '../persistence/db'

export const registerTransactionsIpc = () => {
  const repository = getWalnutRepository()

  ipcMain.handle('transactions:list', (_event, input?: TransactionLedgerQuery) => repository.listTransactions(input))
  ipcMain.handle('transactions:get-detail', (_event, input: GetTransactionDetailInput) => repository.getTransactionDetail(input))
  ipcMain.handle('transactions:update', (_event, input: UpdateTransactionInput) => repository.updateTransaction(input))
}
