import { getRepository, getConnection } from 'typeorm';
import csvParse from 'csv-parse';
import path from 'path';
import fs from 'fs';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import uploadConfig from '../config/upload';

interface Request {
  transactionsFilename: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ transactionsFilename }: Request): Promise<CSVTransaction[]> {
    const transactionsRepository = getRepository(Transaction);
    const categoriesRepository = getRepository(Category);

    const parser = csvParse({ delimiter: ', ', from_line: 2 });

    const transactionsFilePath = path.join(
      uploadConfig.directory,
      transactionsFilename,
    );

    const transactions: CSVTransaction[] = [];

    const csv = fs.createReadStream(transactionsFilePath).pipe(parser);

    csv.on('data', async row => {
      const [title, type, value, category] = row;

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => csv.on('end', resolve));

    await fs.promises.unlink(transactionsFilePath);

    const categories = await categoriesRepository.find({
      select: ['title'],
    });

    const oldCategories = categories.map(category => category.title);

    const newTransactionCategories: string[] = transactions.map(
      transaction => transaction.category,
    );

    const diffCategories = newTransactionCategories
      // retirando categorias duplicadas
      .filter(
        (category, index) =>
          newTransactionCategories.indexOf(category) === index,
      )
      // fazendo o diff entre as que estão no banco e as do csv
      .filter(category => oldCategories.indexOf(category) < 0);

    let newCategories: Category[];

    if (diffCategories.length > 0) {
      newCategories = diffCategories.map(title =>
        categoriesRepository.create({ title }),
      );

      await getConnection()
        .createQueryBuilder()
        .insert()
        .into(Category)
        .values(newCategories)
        .execute();
    }

    const newTransactions: Transaction[] = transactions.map(transaction => {
      const { title, value, type, category } = transaction;
      const category_id = newCategories.find(
        currentCategory => currentCategory.title === category,
      )?.id;

      return transactionsRepository.create({
        title,
        type,
        value,
        category_id,
      });
    });

    await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Transaction)
      .values(newTransactions)
      .execute();

    return transactions;
  }
}

export default ImportTransactionsService;
