export const DATABASE_CONFIG = {
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'trading',
  username: 'postgres',
  password: '',
  logging: false,
  pool: {
    max: 20,
    min: 5,
    acquire: 120000,
    idle: 30000,
  },
  dialectOptions: {
    statement_timeout: 300000,
    idle_in_transaction_session_timeout: 300000,
    application_name: 'trading-gainer',
  },
} as const;
