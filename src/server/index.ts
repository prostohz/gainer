import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import api from './api';
import { Asset } from './models/Asset';
// Импортируем для инициализации, но не используем напрямую
import './models/Candle';
import './models/Trade';
import { errorHandler } from './utils/apiHandler';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', api);

// Общий обработчик ошибок
app.use(errorHandler);

(async () => {
  try {
    console.log('Checking database connection...');

    const sequelize = Asset.sequelize!;
    await sequelize.authenticate();

    console.log('Database connection successful');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Critical database connection error:', error);
    process.exit(1);
  }
})();

export default app;
