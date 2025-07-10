import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import api from './api';
import { Asset } from './models';
import { errorHandler } from './utils/apiHandler';

const app = express();
const PORT = process.env.SERVER_PORT;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', api);

app.use(errorHandler);

(async () => {
  try {
    const sequelize = Asset.sequelize!;
    await sequelize.authenticate();

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
