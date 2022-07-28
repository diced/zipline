import { Datasource } from '.';
import { Readable } from 'stream';
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

interface SwiftAuth {
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
  auth: SwiftAuth | null;

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

  private async getCredentials(): Promise<SwiftAuth> {
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

    const { json, headers, error } = await fetch(`${this.options.auth_endpoint_url}/auth/tokens`, {
      body: JSON.stringify(payload),
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }).then(async (e) => {
      try {
        const json = await e.json();
        return { json, headers: e.headers, error: null };
      } catch (e) {
        return { json: null, headers: null, error: e };
      }
    });

    if (error || !json || !headers || json.error) throw new Error('Could not retrieve credentials from OpenStack, check your config file');

    const catalog = json.token.catalog;
    // many Swift clouds use ceph radosgw to provide swift
    const swiftURL = this.findEndpointURL(catalog, 'swift') || this.findEndpointURL(catalog, 'radosgw-swift');
    if (!swiftURL) throw new Error('Couldn\'t find any "swift" or "radosgw-swift" service in the catalog');

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
    return await fetch(`${auth.swiftURL}/${this.options.credentials.container}${query ? `${query.startsWith('?') ? '' : '?'}${query}` : ''}`, {
      method: 'GET',
      headers: this.generateHeaders(auth.token),
    }).then((e) => e.json());
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

    const arrayBuffer = await fetch(`${auth.swiftURL}/${this.options.credentials.container}/${name}`, {
      method: 'GET',
      headers: this.generateHeaders(auth.token, { Accept: '*/*' }),
    }).then((e) => e.arrayBuffer());

    return Readable.from(Buffer.from(arrayBuffer));
  }

  public async headObject(name: string): Promise<any> {
    const auth = await this.authenticate();

    return fetch(`${auth.swiftURL}/${this.options.credentials.container}/${name}`, {
      method: 'HEAD',
      headers: this.generateHeaders(auth.token),
    });
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
    try {
      return this.container.uploadObject(file, data);
    } catch {
      return null;
    }
  }

  public async delete(file: string): Promise<void> {
    try {
      return this.container.deleteObject(file);
    } catch {
      return null;
    }
  }

  public get(file: string): Promise<Readable> | Readable {
    try {
      return this.container.getObject(file);
    } catch {
      return null;
    }
  }

  public async size(file: string): Promise<number> {
    try {
      const head = await this.container.headObject(file);
      
      return head.headers.get('content-length') || 0;
    } catch {
      return 0;
    }
  }

  public async fullSize(): Promise<number> {
    return this.container
      .listObjects()
      .then((objects) => objects.reduce((acc, object) => acc + object.bytes, 0))
      .catch(() => 0);
  }
}
