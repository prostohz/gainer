import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import api from './api';
import { errorHandler } from './utils/apiHandler';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', api);

// Общий обработчик ошибок
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
