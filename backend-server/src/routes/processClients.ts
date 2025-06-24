import { Router } from 'express';
import { readAllLines } from '../utils/fileUtils';
import { WorkerPool } from '../utils/workerPool';

const router = Router();

const BATCH_SIZE = 1000;
const MAX_WORKERS = 2;

router.post('/', async (req, res) => {
  try {
    const startTime = Date.now();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const lines = await readAllLines('CLIENTES_IN_0425.dat');

    const batches: string[][] = [];
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      batches.push(lines.slice(i, i + BATCH_SIZE));
    }

    const pool = new WorkerPool(MAX_WORKERS);
    const totalBatches = batches.length;
    const totalLines = lines.length;

    let inserted = 0;
    let errors = 0;
    let processedLines = 0;
    let completedBatches = 0;

    const promises = batches.map(async (batch) => {
      const result = await pool.runTask(batch);

      inserted += result.insertedCount;
      errors += result.errorCount;
      processedLines += batch.length;
      completedBatches++;

      const percent = ((processedLines / totalLines) * 100).toFixed(2);
      res.write(`Batch ${completedBatches}/${totalBatches} - Progress: ${percent}% (${processedLines}/${totalLines}) - Inserted: ${inserted}, Errors: ${errors}\n`);
    });

    await Promise.all(promises);
    await pool.shutdown();

    const endTime = Date.now();
    const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

    res.end(`\n Done. Total inserted: ${inserted}, errors: ${errors}. Elapsed time: ${elapsedSeconds} seconds.\n`);
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send('Failed to process file');
  }
});

export default router;
