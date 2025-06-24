console.log('Client processor loaded: ', new Date().toISOString());

import { parentPort } from 'worker_threads';
import { getConnection } from '../db/connection';
import sql from 'mssql';

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in worker:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection in worker:', reason, promise);
});

process.on('warning', (warning) => {
  console.warn('Worker warning:', warning);
});

process.on('multipleResolves', (type, promise, reason) => {
  console.warn('Multiple resolves detected:', type, reason);
});

interface WorkerMessage {
  batchLines: string[];
}

interface WorkerResult {
  insertedCount: number;
  errorCount: number;
}

function parseLine(line: string) {
  if (!line.trim()) return null;

  const fields = line.split('|');
  if (fields.length < 7) return null;

  let firstName = fields[0].trim();
  let lastName = fields[1].trim();

  const maxTotalLength = 100;
  const maxFirstNameLength = 30;
  const maxLastNameLength = 60;

  if (firstName.length > maxFirstNameLength) {
    firstName = firstName.slice(0, maxFirstNameLength);
  }
  if (lastName.length > maxLastNameLength) {
    lastName = lastName.slice(0, maxLastNameLength);
  }

  let NombreCompleto = `${firstName} ${lastName}`;
  if (NombreCompleto.length > maxTotalLength) {
    NombreCompleto = NombreCompleto.slice(0, maxTotalLength);
  }

  const DNI = fields[2].trim();
  const Estado = fields[3].trim();
  const FechaIngreso = fields[4].trim();
  const EsPEP = fields[5].trim().toLowerCase() === 'true' ? 1 : 0;
  const EsSujetoObligado = fields[6].trim().toLowerCase() === 'true' ? 1 : 0;

  if (FechaIngreso === '99/99/9999' || FechaIngreso === '0000-00-00' || FechaIngreso === '') {
    return null;
  }

  if (!/^\d+$/.test(DNI)) {
    console.error(`Invalid DNI detected, skipping row: ${DNI}`);
    return null;
  }

  return { NombreCompleto, DNI, Estado, FechaIngreso, EsPEP, EsSujetoObligado };
}

function buildBulkInsertQuery(rows: NonNullable<ReturnType<typeof parseLine>>[]) {
  const valuesSql: string[] = [];
  const inputs: { [key: string]: { type: any; value: any } } = {};

  rows.forEach((row, i) => {
    const idx = i + 1;
    valuesSql.push(
      `(@NombreCompleto${idx}, @DNI${idx}, @Estado${idx}, @FechaIngreso${idx}, @EsPEP${idx}, @EsSujetoObligado${idx})`
    );
    inputs[`NombreCompleto${idx}`] = { type: sql.NVarChar(100), value: row.NombreCompleto };
    inputs[`DNI${idx}`] = { type: sql.BigInt, value: BigInt(row.DNI) };
    inputs[`Estado${idx}`] = { type: sql.VarChar(10), value: row.Estado };

    const fecha = new Date(row.FechaIngreso);
    if (isNaN(fecha.getTime())) {
      throw new Error(`Invalid FechaIngreso date: ${row.FechaIngreso}`);
    }
    
    inputs[`FechaIngreso${idx}`] = { type: sql.Date, value: fecha };
    inputs[`EsPEP${idx}`] = { type: sql.Bit, value: row.EsPEP };
    inputs[`EsSujetoObligado${idx}`] = { type: sql.Bit, value: row.EsSujetoObligado };
  });

  const sqlQuery = `
    INSERT INTO Clientes (NombreCompleto, DNI, Estado, FechaIngreso, EsPEP, EsSujetoObligado)
    VALUES ${valuesSql.join(', ')}
  `;

  return { sqlQuery, inputs };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

let poolPromise = getConnection();

parentPort?.on('message', async (message: WorkerMessage | 'shutdown') => {
  if (message === 'shutdown') {
    try {
      const pool = await poolPromise;
      console.log('Shutdown message received. Closing DB connection pool...');
      await pool.close();
      console.log('Worker DB connection pool closed on shutdown.');
    } catch (err) {
      console.error('Error closing pool on shutdown:', err);
    } finally {
      process.exit(0);
    }
    return;
  }

  try {
    console.log('Worker message received, starting processing.');

    const pool = await poolPromise;
    console.log('Worker connected to DB:', pool.config.connectionString || pool.config.server || 'unknown');
    if (!pool) {
      console.error('Failed to connect to database in worker');
      return;
    }

    const parsedRows = [];
    let errorCount = 0;

    for (const line of message.batchLines) {
      const parsed = parseLine(line);
      if (parsed !== null) parsedRows.push(parsed);
      else errorCount++;
    }

    let insertedCount = 0;
    const MAX_ROWS_PER_BATCH = 100;
    const chunks = chunkArray(parsedRows, MAX_ROWS_PER_BATCH);

    for (const chunk of chunks) {
      console.log(`[Worker] Inserting batch with ${chunk.length} rows (${chunk.length * 6} parameters)`);
      try {
        const { sqlQuery, inputs } = buildBulkInsertQuery(chunk);
        const request = pool.request();
        for (const [key, val] of Object.entries(inputs)) {
          request.input(key, val.type, val.value);
        }
        await request.query(sqlQuery);
        insertedCount += chunk.length;
      } catch (error) {
        errorCount += chunk.length;
        console.error('[Worker] Bulk insert failed:', error, (error as any)?.stack);
      }
    }

    const result: WorkerResult = { insertedCount, errorCount };
    parentPort?.postMessage(result);
    console.log('Message sent to main thread.');

  } catch (err) {
    console.error('Unexpected error in worker message handler:', err);
    parentPort?.postMessage({ insertedCount: 0, errorCount: (message as WorkerMessage).batchLines.length });
  } finally {
    console.log('Worker message handler finally block executed.');
  }
});

// just in case I need to catch errors
setTimeout(() => {
  console.log('Worker still alive after 5 seconds...');
}, 5000);
