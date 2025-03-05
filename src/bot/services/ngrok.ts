import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '../config';

const execAsync = promisify(exec);

export class NgrokService {
  private static instance: NgrokService;
  private tunnelUrl: string | null = null;

  private constructor() {}

  public static getInstance(): NgrokService {
    if (!NgrokService.instance) {
      NgrokService.instance = new NgrokService();
    }
    return NgrokService.instance;
  }

  public async startTunnel(): Promise<string> {
    try {
      await this.killExistingProcesses();
      await this.waitForProcessTermination();
      
      const url = await this.createTunnel();
      this.tunnelUrl = url;
      
      return url;
    } catch (error) {
      throw new Error(`Failed to create ngrok tunnel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public getTunnelUrl(): string | null {
    return this.tunnelUrl;
  }

  private async killExistingProcesses(): Promise<void> {
    try {
      await execAsync('pkill ngrok');
      console.log('Killed existing ngrok processes');
    } catch (error) {
      // Ignore errors if no ngrok processes were running
    }
  }

  private async waitForProcessTermination(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async createTunnel(): Promise<string> {
    const { binary, authToken } = config.ngrok;
    const { port } = config.server;

    console.log('Starting ngrok...');
    
    const child = exec(`${binary} http ${port} --authtoken="${authToken}"`);
    
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        if (data.includes('started tunnel') || data.includes('error')) {
          console.log('ngrok:', data);
        }
      });
    }
    
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        console.error('ngrok error:', data);
      });
    }

    const url = await this.waitForTunnel();
    console.log('\n📡 Webhook URL:', url + '/webhook');
    console.log('Click this URL to bypass the warning page\n');
    
    return url;
  }

  private async waitForTunnel(): Promise<string> {
    let tunnels = null;
    let retries = 0;
    const maxRetries = 20;

    while (!tunnels && retries < maxRetries) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { stdout: tunnelInfo, stderr: tunnelError } = await execAsync(
          'curl -s -H "ngrok-skip-browser-warning: true" http://127.0.0.1:4040/api/tunnels'
        );
        
        if (tunnelError) {
          throw new Error(tunnelError);
        }
        
        if (!tunnelInfo) {
          retries++;
          continue;
        }
        
        const tunnelData = JSON.parse(tunnelInfo);
        
        if (tunnelData.tunnels && tunnelData.tunnels.length > 0) {
          tunnels = tunnelData.tunnels;
          break;
        }
      } catch (error) {
        retries++;
      }
    }

    if (!tunnels) {
      throw new Error('Failed to create ngrok tunnel after multiple attempts');
    }
    
    return tunnels[0].public_url;
  }

  public async stop(): Promise<void> {
    await this.killExistingProcesses();
    this.tunnelUrl = null;
  }
} 