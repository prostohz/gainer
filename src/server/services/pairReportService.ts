import path from 'path';
import fs from 'fs';

import { TPairReport } from '../../shared/types';
import { dayjs } from '../../shared/utils/daytime';
import { measureTime } from '../utils/performance/measureTime';
import { pairReportLogger as logger } from '../utils/logger';
import { run } from '../trading/strategies/MeanReversionStrategy/backtest';
import { buildPairReport } from '../modules/PairReportBuilder';

const pairReportFolder = path.resolve(process.cwd(), 'data', 'pairReports');
const pairReportMetaDataFilePath = (id: string) => path.join(pairReportFolder, id, 'report.json');
const pairReportDataFilePath = (id: string) => path.join(pairReportFolder, id, 'data.json');
const pairReportBacktestFilePath = (id: string) => path.join(pairReportFolder, id, 'backtest.json');

export const getReportList = async () => {
  const entries = fs.readdirSync(pairReportFolder);

  return entries
    .filter((entry) => {
      const stat = fs.statSync(path.join(pairReportFolder, entry));
      return stat.isDirectory();
    })
    .map((entry) => {
      const reportMetaData = fs.readFileSync(
        path.join(pairReportFolder, entry, 'report.json'),
        'utf-8',
      );
      const reportData = fs.readFileSync(path.join(pairReportFolder, entry, 'data.json'), 'utf-8');

      const reportMetaDataJSON = JSON.parse(reportMetaData) as Pick<TPairReport, 'id' | 'date'>;
      const reportDataJSON = JSON.parse(reportData) as TPairReport['data'];
      const backtest = fs.existsSync(pairReportBacktestFilePath(entry))
        ? JSON.parse(fs.readFileSync(pairReportBacktestFilePath(entry), 'utf-8'))
        : null;

      return {
        id: reportMetaDataJSON.id,
        date: reportMetaDataJSON.date,
        data: reportDataJSON,
        backtest,
      };
    });
};

export const createReport = measureTime(
  'Report creation',
  async (date: number) => {
    const id = `${date}`;
    const report = await buildPairReport(date);

    fs.mkdirSync(path.join(pairReportFolder, id), { recursive: true });

    const reportMetaData = {
      id,
      date,
    };

    fs.writeFileSync(pairReportMetaDataFilePath(id), JSON.stringify(reportMetaData, null, 2));
    fs.writeFileSync(pairReportDataFilePath(id), JSON.stringify(report, null, 2));
  },
  logger.info,
);

export const getReport = async (id: string) => {
  if (
    !fs.existsSync(pairReportMetaDataFilePath(id)) ||
    !fs.existsSync(pairReportDataFilePath(id))
  ) {
    return null;
  }

  const reportMetaDataContent = fs.readFileSync(pairReportMetaDataFilePath(id), 'utf-8');
  const reportDataContent = fs.readFileSync(pairReportDataFilePath(id), 'utf-8');

  const reportMetaData = JSON.parse(reportMetaDataContent) as Pick<TPairReport, 'id' | 'date'>;
  const reportData = JSON.parse(reportDataContent) as TPairReport['data'];

  return {
    ...reportMetaData,
    data: reportData,
  };
};

export const updateReport = async (id: string) => {
  const report = await getReport(id);
  if (!report) {
    return;
  }

  await createReport(report.date);
};

export const deleteReport = async (id: string) => {
  fs.rmSync(path.join(pairReportFolder, id), { recursive: true });
};

export const getReportBacktest = async (id: string) => {
  if (!fs.existsSync(pairReportBacktestFilePath(id))) {
    return null;
  }

  const reportBacktestContent = fs.readFileSync(pairReportBacktestFilePath(id), 'utf-8');
  const reportBacktest = JSON.parse(reportBacktestContent);

  return reportBacktest;
};

export const createReportBacktest = async (
  id: string,
  startTimestamp: number,
  endTimestamp: number,
) => {
  const report = await getReport(id);
  if (!report) {
    return null;
  }

  logger.info(`Creating backtest for ${dayjs(report.date).format('DD.MM.YYYY HH:mm')}`);

  const reportBacktest = await run(
    report.data.map(({ assetA, assetB }) => ({
      assetA,
      assetB,
    })),
    startTimestamp,
    endTimestamp,
  );

  fs.writeFileSync(pairReportBacktestFilePath(id), JSON.stringify(reportBacktest, null, 2));
};

export const deleteReportBacktest = async (id: string) => {
  const report = await getReport(id);
  if (!report) {
    return null;
  }

  fs.rmSync(pairReportBacktestFilePath(id));
};
