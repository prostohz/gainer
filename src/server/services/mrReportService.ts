import path from 'path';
import fs from 'fs';

import { TMRReport } from '../../shared/types';
import { dayjs } from '../../shared/utils/daytime';
import { measureTime } from '../utils/performance/measureTime';
import { mrReportLogger as logger } from '../utils/logger';
import { run } from '../trading/strategies/MRStrategy/backtest';
import { buildMrReport } from '../modules/mrReportBuilder';

const mrReportFolder = path.resolve(process.cwd(), 'data', 'mrReports');
const mrReportMetaDataFilePath = (id: string) => path.join(mrReportFolder, id, 'report.json');
const mrReportDataFilePath = (id: string) => path.join(mrReportFolder, id, 'data.json');
const mrReportBacktestFilePath = (id: string) => path.join(mrReportFolder, id, 'backtest.json');

export const getReportList = async (startDate?: number, endDate?: number) => {
  const entries = fs.readdirSync(mrReportFolder);

  return entries
    .filter((entry) => {
      const stat = fs.statSync(path.join(mrReportFolder, entry));
      return stat.isDirectory() && dayjs(Number(entry)).isBetween(startDate, endDate);
    })
    .map((entry) => {
      const reportMetaData = fs.readFileSync(
        path.join(mrReportFolder, entry, 'report.json'),
        'utf-8',
      );
      const reportData = fs.readFileSync(path.join(mrReportFolder, entry, 'data.json'), 'utf-8');

      const reportMetaDataJSON = JSON.parse(reportMetaData) as Pick<TMRReport, 'id' | 'date'>;
      const reportDataJSON = JSON.parse(reportData) as TMRReport['data'];
      const backtest = fs.existsSync(mrReportBacktestFilePath(entry))
        ? JSON.parse(fs.readFileSync(mrReportBacktestFilePath(entry), 'utf-8'))
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
    const report = await buildMrReport(date);

    fs.mkdirSync(path.join(mrReportFolder, id), { recursive: true });

    const reportMetaData = {
      id,
      date,
    };

    fs.writeFileSync(mrReportMetaDataFilePath(id), JSON.stringify(reportMetaData, null, 2));
    fs.writeFileSync(mrReportDataFilePath(id), JSON.stringify(report, null, 2));
  },
  logger.info,
);

export const getReport = async (id: string) => {
  if (!fs.existsSync(mrReportMetaDataFilePath(id)) || !fs.existsSync(mrReportDataFilePath(id))) {
    return null;
  }

  const reportMetaDataContent = fs.readFileSync(mrReportMetaDataFilePath(id), 'utf-8');
  const reportDataContent = fs.readFileSync(mrReportDataFilePath(id), 'utf-8');

  const reportMetaData = JSON.parse(reportMetaDataContent) as Pick<TMRReport, 'id' | 'date'>;
  const reportData = JSON.parse(reportDataContent) as TMRReport['data'];

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
  fs.rmSync(path.join(mrReportFolder, id), { recursive: true });
};

export const getReportBacktest = async (id: string) => {
  if (!fs.existsSync(mrReportBacktestFilePath(id))) {
    return null;
  }

  const reportBacktestContent = fs.readFileSync(mrReportBacktestFilePath(id), 'utf-8');
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

  logger.info(`Creating backtest for: ${dayjs(report.date).format('DD.MM.YYYY HH:mm')}`);

  const reportBacktest = await run(
    report.data.map(({ assetA, assetB }) => ({
      assetA,
      assetB,
    })),
    startTimestamp,
    endTimestamp,
  );

  fs.writeFileSync(mrReportBacktestFilePath(id), JSON.stringify(reportBacktest, null, 2));
};

export const deleteReportBacktest = async (id: string) => {
  const report = await getReport(id);
  if (!report) {
    return null;
  }

  fs.rmSync(mrReportBacktestFilePath(id));
};
