import { Datasource } from '.';
import { Readable, Writable } from 'stream';
import { ConfigSwiftDatasource } from 'lib/config/Config';

interface SwiftContainerOptions {
  auth_endpoint_url: string;
  credentials: {
    username: string;
    password: string;
    project_id: string;
    domain_id: string;
    container: string;
    interface?: string;
    region_id: string;
  };
  refreshMargin?: number;
}
interface IAuth {
  token: string;
  expires: Date;
  swiftURL: string;
}
interface SwiftObject {
  bytes: number;
  content_type: string;
  hash: string;
  name: string;
  last_modified: string;
}

class SwiftContainer {
  auth: IAuth | null;
  constructor(private options: SwiftContainerOptions) {
    this.auth = null;
  }
  private findEndpointURL(catalog: any[], service: string): string | null {
    const catalogEntry = catalog.find((x) => x.name === service);
    if (!catalogEntry) return null;

    const endpoint = catalogEntry.endpoints.find(
      (x: any) =>
        x.interface === (this.options.credentials.interface || 'public') &&
        (this.options.credentials.region_id
          ? x.region_id == this.options.credentials.region_id
          : true)
    );

    return endpoint ? endpoint.url : null;
  }
  private async getCredentials(): Promise<IAuth> {
    const payload = {
      auth: {
        identity: {
          methods: ['password'],
          password: {
            user: {
              name: this.options.credentials.username,
              password: this.options.credentials.password,
              domain: {
                id: this.options.credentials.domain_id || 'default',
              },
            },
          },
        },
        scope: {
          project: {
            id: this.options.credentials.project_id,
            domain: {
              id: this.options.credentials.domain_id || 'default',
            },
          },
        },
      },
    };
    const { json, headers } = await fetch(`${this.options.auth_endpoint_url}/auth/tokens`, {
      body: JSON.stringify(payload),
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }).then(async (e) => ({ json: await e.json(), headers: e.headers }));
    const catalog = json.token.catalog;
    const swiftURL =
      this.findEndpointURL(catalog, 'swift') || this.findEndpointURL(catalog, 'radosgw-swift'); // many Swift clouds use ceph radosgw to provide swift
    if (!swiftURL)
      throw new Error('Couldn\'t find any "swift" or "radosgw-swift" service in the catalog');
    return {
      token: headers.get('x-subject-token'),
      expires: new Date(json.token.expires_at),
      swiftURL,
    };
  }
  private async authenticate() {
    if (!this.auth) this.auth = await this.getCredentials();
    const authExpiry = new Date(Date.now() + this.options.refreshMargin || 10_000);
    if (authExpiry > this.auth.expires) this.auth = await this.getCredentials();
    const validAuth = this.auth;
    return { swiftURL: validAuth.swiftURL, token: validAuth.token };
  }
  private generateHeaders(token: string, extra?: any) {
    return { accept: 'application/json', 'x-auth-token': token, ...extra };
  }
  public async listObjects(query?: string): Promise<SwiftObject[]> {
    const auth = await this.authenticate();
    return await fetch(
      `${auth.swiftURL}/${this.options.credentials.container}${
        query ? `${query.startsWith('?') ? '' : '?'}${query}` : ''
      }`,
      {
        method: 'GET',
        headers: this.generateHeaders(auth.token),
      }
    ).then((e) => e.json());
  }
  public async uploadObject(name: string, data: Buffer): Promise<any> {
    const auth = await this.authenticate();
    return fetch(`${auth.swiftURL}/${this.options.credentials.container}/${name}`, {
      method: 'PUT',
      headers: this.generateHeaders(auth.token),
      body: data,
    });
  }
  public async deleteObject(name: string): Promise<any> {
    const auth = await this.authenticate();
    return fetch(`${auth.swiftURL}/${this.options.credentials.container}/${name}`, {
      method: 'DELETE',
      headers: this.generateHeaders(auth.token),
    });
  }
  public async getObject(name: string): Promise<Readable> {
    const auth = await this.authenticate();
    const arrayBuffer = await fetch(
      `${auth.swiftURL}/${this.options.credentials.container}/${name}`,
      {
        method: 'GET',
        headers: this.generateHeaders(auth.token, { Accept: '*/*' }),
      }
    ).then((e) => e.arrayBuffer());
    return Readable.from(Buffer.from(arrayBuffer));
  }
}

export class Swift extends Datasource {
  public name: string = 'Swift';
  container: SwiftContainer;

  public constructor(public config: ConfigSwiftDatasource) {
    super();
    this.container = new SwiftContainer({
      auth_endpoint_url: config.auth_endpoint,
      credentials: {
        username: config.username,
        password: config.password,
        project_id: config.project_id,
        domain_id: config.domain_id || 'default',
        container: config.container,
        region_id: config.region_id,
      },
    });
  }

  public async save(file: string, data: Buffer): Promise<void> {
    return this.container.uploadObject(file, data);
  }

  public async delete(file: string): Promise<void> {
    return this.container.deleteObject(file);
  }

  public get(file: string): Promise<Readable> {
    return this.container.getObject(file);
  }

  public async size(): Promise<number> {
    return this.container
      .listObjects()
      .then((objects) => objects.reduce((acc, object) => acc + object.bytes, 0));
  }
}