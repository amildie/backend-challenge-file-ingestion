import { Worker } from 'worker_threads';
import path from 'path';

interface WorkerResult {
  insertedCount: number;
  errorCount: number;
}

interface WorkerTask {
  batchLines: string[];
  resolve: (result: WorkerResult) => void;
  reject: (error: any) => void;
}

export class WorkerPool {
  private maxWorkers: number;
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private taskMap = new Map<Worker, WorkerTask>();

  constructor(maxWorkers: number) {
    this.maxWorkers = maxWorkers;
  }

  private createWorker(): Worker {
    const workerPath = path.resolve(__dirname, '../workers/clientProcessor.js');
    const worker = new Worker(workerPath);

    worker.setMaxListeners(20);

    worker.on('error', (err) => {
      console.error('Worker error:', err);
      const task = this.taskMap.get(worker);
      if (task) {
        task.reject(err);
        this.taskMap.delete(worker);
      }
      
      this.removeWorker(worker);
      this.tryStartNextTask();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      } else {
        console.log(`Worker exited gracefully with code 0`);
      }
      
      this.taskMap.delete(worker);
      this.removeWorker(worker);
      this.tryStartNextTask();
    });

    worker.on('message', (result: WorkerResult) => {
      const task = this.taskMap.get(worker);
      if (task) {
        console.log(`Worker completed task: inserted=${result.insertedCount}, errors=${result.errorCount}`);
        task.resolve(result);
        this.taskMap.delete(worker);
        this.availableWorkers.push(worker);
        this.tryStartNextTask();
      } else {
        console.warn('Received message from worker with no assigned task.');
      }
    });

    console.log('Created new worker');
    return worker;
  }

  private removeWorker(worker: Worker) {
    this.workers = this.workers.filter(w => w !== worker);
    this.availableWorkers = this.availableWorkers.filter(w => w !== worker);
  }

  runTask(batchLines: string[]): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = { batchLines, resolve, reject };
      this.taskQueue.push(task);
      this.tryStartNextTask();
    });
  }

  private tryStartNextTask() {
    if (this.taskQueue.length === 0) return;

    if (this.availableWorkers.length === 0 && this.workers.length < this.maxWorkers) {
      const worker = this.createWorker();
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }

    if (this.availableWorkers.length === 0) return;

    const worker = this.availableWorkers.pop()!;
    const task = this.taskQueue.shift()!;

    console.log(`Assigning task with ${task.batchLines.length} lines to worker`);

    this.taskMap.set(worker, task);
    try {
      worker.postMessage({ batchLines: task.batchLines });
    } catch (err) {
      console.error('Failed to post message to worker:', err);
      task.reject(err);
      this.taskMap.delete(worker);
      this.availableWorkers.push(worker);
      this.tryStartNextTask();
    }
  }

  async shutdown() {
    console.log('Shutting down worker pool...');
    
    await Promise.all(
      this.workers.map(worker => {
        return new Promise<void>((resolve) => {
          const onExit = (code: number) => {
            console.log(`Worker exited with code ${code}`);
            worker.removeListener('exit', onExit);
            resolve();
          };
          worker.once('exit', onExit);
          worker.postMessage('shutdown');
        });
      })
    );

    this.workers = [];
    this.availableWorkers = [];
    this.taskMap.clear();
    console.log('Worker pool shutdown complete.');
  }
}
