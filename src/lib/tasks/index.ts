import { Worker } from 'worker_threads';
import Logger, { log } from '../logger';

export interface Task {
  id: string;

  started: boolean;
  logger: Logger;

  tasks: Tasks;
}

export interface WorkerTask<Data = any> extends Task {
  path: string;
  data: Data;

  worker?: Worker;
}

export interface IntervalTask extends Task {
  interval: number;
  func: () => void;

  timeout?: NodeJS.Timeout;
}

export class Tasks {
  private logger: Logger = log('tasks');

  public constructor(public tasks: Task[] = []) {}

  public start(): void {
    this.logger.debug('starting tasks', {
      tasks: this.tasks.length,
    });

    for (const task of this.tasks) {
      if (task.started) continue;

      task.logger = this.logger.c(task.id);

      task.tasks = this;

      if ('interval' in task) {
        this.logger.debug('running first run', {
          id: task.id,
        });
        (task as IntervalTask).func.bind(task)();

        this.startInterval(task as IntervalTask);
      } else if ('path' in task) {
        this.startWorker(task as WorkerTask);
      }
    }
  }

  public runJob(id: string, ...args: any[]): void | any {
    const task = this.tasks.find((x) => x.id === id);
    if (!task) throw new Error(`task ${id} not found`);

    if ('interval' in task) {
      this.logger.debug('running job', {
        id: task.id,
      });

      return (task as IntervalTask).func.bind(task, ...args)();
    }

    return;
  }

  private startInterval(task: IntervalTask) {
    if (task.interval === 0) {
      this.logger.debug('not starting interval', {
        id: task.id,
        interval: task.interval,
      });

      return;
    }

    task.started = true;

    const timeout = setInterval(task.func.bind(task), task.interval);
    task.timeout = timeout;

    this.logger.debug('started interval task', {
      id: task.id,
      interval: task.interval,
    });
  }

  private startWorker(task: WorkerTask) {
    task.started = true;

    const worker = new Worker(task.path, {
      workerData: task.data,
    });

    worker.once('exit', (code) => {
      this.logger.debug('worker exited', {
        id: task.id,
        code,
      });

      const index = this.tasks.findIndex((x) => x.id === task.id);
      if (index === -1) return;

      this.tasks.splice(index, 1);
    });

    task.worker = worker;

    this.logger.debug('started worker', {
      id: task.id,
    });
  }

  public interval(id: string, interval: number, func: () => void, start: boolean = false): void {
    const len = this.tasks.push({
      id,
      interval,
      func,
      started: false,
    } as IntervalTask);

    if (start) this.startInterval(this.tasks[len - 1] as IntervalTask);
  }

  public worker<Data = any>(id: string, path: string, data: Data, start: boolean = false): WorkerTask<Data> {
    const len = this.tasks.push({
      id,
      path,
      data,
      started: false,
    } as WorkerTask<Data>);

    if (start) this.startWorker(this.tasks[len - 1] as WorkerTask<Data>);

    return this.tasks[len - 1] as WorkerTask<Data>;
  }
}
