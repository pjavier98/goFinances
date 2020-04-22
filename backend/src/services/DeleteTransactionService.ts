import { getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getRepository(Transaction);

    const transactionExist = await transactionsRepository.findOne(id);

    if (!transactionExist) {
      throw new AppError('Transaction not found', 404);
    }

    transactionsRepository.delete(id);
  }
}

export default DeleteTransactionService;
