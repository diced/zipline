import { Datasource } from './';
import SwiftClient from 'openstack-swift-client';
import { Readable, Writable } from 'stream';
import { ConfigOpenstackDatasource } from 'lib/config/Config';
import Logger from '../logger';

export class Openstack extends Datasource {
  public name: string = 'Openstack';
  container: SwiftClient.SwiftContainer;

  public constructor(
    public config: ConfigOpenstackDatasource,
  ) {
    super();
    // @ts-ignore
    const authenticator = new SwiftClient.KeystoneV3Authenticator({
      endpointUrl: config.endpoint,
      username: config.username,
      password:  config.password,
      projectId: config.project_id,
      domainId: config.domain_id,
    });
    const swift = new SwiftClient(authenticator);
    this.container = swift.container(config.container);
  }

  public async save(file: string, data: Buffer): Promise<void> {
    Logger.get('datasource').info(`Saving ${file}`);    
    // @ts-ignore
    this.container.create(file, Readable.from(data));
  }

  public async delete(file: string): Promise<void> {
    return this.container.delete(file);
  }

  public get(file: string): Promise<Readable> {
    return new Promise<Readable>((resolve) => {
      const writable = new Writable({highWaterMark:Math.pow(2, 20)});
      writable._write = (_,__,next) => next();
      writable.on('pipe', (src) => {
        resolve(src);
      });
      // @ts-ignore
      this.container.get(file, writable);
    });
  }

  public async size(): Promise<number> {
    return this.container.list().then(objects => objects.reduce((acc, object) => acc + object.bytes, 0));
  }
}