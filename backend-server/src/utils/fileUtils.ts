import fs from 'fs';
import readline from 'readline';
import path from 'path';

export async function readFirstNLines(filename: string, n: number): Promise<string[]> {
  //const filePath = path.resolve(__dirname, '../../../data-generator/challenge/input', filename);``
  const filePath = '/input/CLIENTES_IN_0425.dat';

  const lines: string[] = [];

  try {
    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      lines.push(line);
      if (lines.length >= n) break;
    }

    rl.close();

    return lines;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}

export async function readAllLines(filename: string): Promise<string[]> {
  //const filePath = path.resolve(__dirname, '../../../data-generator/challenge/input', filename);
  const filePath = '/input/CLIENTES_IN_0425.dat';

  const lines: string[] = [];

  try {
    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      lines.push(line);
    }

    rl.close();

    return lines;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}