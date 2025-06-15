import { ChildProcess, spawn } from 'child_process';

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

export class PythonWorker {
  private proc: ChildProcess;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor(scriptPath: string) {
    this.proc = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (!this.proc.stdout || !this.proc.stderr) {
      throw new Error('Failed to spawn Python process');
    }

    let buffer = '';

    this.proc.stdout.on('data', (chunk) => {
      buffer += chunk;
      let i;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        if (!line.trim()) {
          continue;
        }
        const msg = JSON.parse(line);
        const p = this.pending.get(msg.id);
        if (!p) {
          continue;
        }
        this.pending.delete(msg.id);

        if (msg.error) {
          p.reject(new Error(msg.error));
        } else {
          p.resolve(msg.result);
        }
      }
    });

    this.proc.stderr.on('data', (d) => console.error('[PY]', d.toString()));
  }

  call<T>(func: string, payload: unknown): Promise<T> {
    const id = this.nextId++;
    const msg = { id, func, payload };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.proc.stdin!.write(JSON.stringify(msg) + '\n');
    });
  }
}
