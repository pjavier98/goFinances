import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > balance.total) {
      throw new AppError('You do not have enough money', 400);
    }

    let categoryExist = await categoriesRepository.findOne({
      where: { title: category },
      select: ['id'],
    });

    if (!categoryExist) {
      categoryExist = categoriesRepository.create({
        title: category,
      });

      await categoriesRepository.save(categoryExist);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryExist.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
