# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a cryptocurrency trading system focused on arbitrage and mean reversion strategies. The system analyzes market data from Binance, implements trading strategies, performs backtesting, and provides a web dashboard for monitoring and analysis.

## Development Commands

### Main Application

- `npm run dashboard` - Start both server and client in development mode
- `npm run dashboard:server` - Start only the Express server (port 3001)
- `npm run dashboard:client` - Start only the Vite dev server (port 3000)

### Trading Strategies

- `npm run meanReversion:debug` - Debug mean reversion strategy
- `npm run meanReversion:backtest` - Run backtest for mean reversion strategy

### Database Operations

- `npm run migrate:postgres` - Migrate from SQLite to PostgreSQL
- `npm run cleanup:sqlite` - Clean up SQLite database

### Code Quality

- `npm test` - Run Jest tests
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Architecture

### Tech Stack

- **Backend**: Node.js, Express.js, TypeScript, Sequelize ORM
- **Frontend**: React, Vite, TailwindCSS, DaisyUI, React Query
- **Database**: SQLite (default) or PostgreSQL (configurable)
- **Trading**: Binance API integration, WebSocket streams
- **Math/Stats**: MathJS, Remeda for data processing

### Project Structure

```
src/
├── client/           # React frontend
│   ├── app/         # Main App component and Navigation
│   ├── pages/       # Route components (MrReport, Backtest, etc.)
│   ├── widgets/     # Reusable UI components (Charts, Selectors)
│   └── shared/      # Types, utilities, UI components
├── server/          # Express backend
│   ├── api/         # REST API endpoints
│   ├── models/      # Sequelize models (Asset, Candle, Trade)
│   ├── services/    # Business logic services
│   ├── trading/     # Trading engine
│   │   ├── strategies/  # Trading strategies (MRStrategy)
│   │   ├── indicators/  # Technical indicators (ADX, ZScore, etc.)
│   │   └── providers/   # Data providers (Binance API)
│   └── utils/       # Helper utilities
└── shared/          # Shared types between client/server
```

### Key Components

#### Trading System

- **MRStrategy**: Core trading strategy using Z-score analysis, beta hedging, and ADX trend detection
- **Indicators**: ADX, ZScore, BetaHedge, HurstExponent, PearsonCorrelation
- **Data Providers**: Binance HTTP/WebSocket clients with rate limiting
- **Backtesting**: Historical strategy performance analysis

#### Database Models

- **Candle**: OHLCV market data with symbol/timeframe indexing
- **Asset**: Trading pairs and market information
- **Trade**: Executed trade records

#### Frontend Pages

- **MrReportListPage**: Overview of trading pair performance
- **MrReportPage**: Detailed analysis of specific trading pairs
- **MrReportBacktestPage**: Backtest results visualization
- **PairAnalysisPage**: Real-time pair analysis and metrics
- **AssetPriceLevelsPage**: Price level analysis
- **SystemPage**: System monitoring and controls

## Configuration

### Database Configuration

The system supports both SQLite and PostgreSQL. Configuration is handled via environment variables:

```env
DB_DIALECT=sqlite|postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trading
DB_USER=trading_user
DB_PASSWORD=your_password
```

### Trading Configuration

Trading parameters are defined in `src/server/configs/trading.ts`:

- Commission rates for position opening and margin
- Risk management parameters

## Development Guidelines

### Code Style

- Use TypeScript strict mode with strong typing
- Follow SOLID principles and design patterns
- Avoid `any` types
- Use Remeda for functional programming utilities
- Use MathJS for mathematical operations

### Trading Strategy Development

- Implement strategies in `src/server/trading/strategies/`
- Use event-driven architecture with EventEmitter
- Implement proper state management (scanning, waiting, suspended)
- Include comprehensive backtesting capabilities
- Follow risk management principles

### Database Operations

- Use Sequelize ORM for all database operations
- Implement proper indexing for performance
- Support both SQLite (development) and PostgreSQL (production)
- Use migrations for schema changes

### Testing

- Use Jest for unit tests
- Test trading indicators and strategies thoroughly
- Mock external API calls in tests
- Include backtesting validation

## Python Integration

The system includes Python workers for certain calculations:

- Half-life calculations (`HalfLife.py`)
- Pearson correlation analysis (`PearsonCorrelation.py`)
- Use `PythonWorker.ts` for TypeScript-Python integration

## Performance Considerations

- Database queries are optimized with proper indexing
- WebSocket connections for real-time data
- Rate limiting for API calls
- Efficient candle data processing
- PostgreSQL migration for better performance under load

## Risk Management

- Position sizing controls
- Stop-loss mechanisms
- Z-score thresholds for entry/exit
- ADX trend strength validation
- Commission rate calculations
