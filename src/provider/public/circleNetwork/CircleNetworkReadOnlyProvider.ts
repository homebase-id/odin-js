import { ApiType, ProviderBase, ProviderOptions } from '../../core/ProviderBase';
import { PagedResult, PagingOptions } from '../../core/Types';

const stringify = (obj: any) => {
  return Object.keys(obj)
    .map((key) => key + '=' + obj[key])
    .join('&');
};

export class CircleNetworkReadOnlyProvider extends ProviderBase {
  private root = '/circles/connections';

  constructor(options: ProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });
  }

  async getConnections(data: PagingOptions): Promise<PagedResult<{ dotYouId: string }>> {
    const client = super.createAxiosClient();
    const url = this.root + '/connected?' + stringify(data);

    if (this.getType() === ApiType.Owner) {
      // Post needed
      return client.post(url).then((response) => {
        return response.data;
      });
    } else {
      return client.get(url).then((response) => {
        return response.data;
      });
    }
  }
}
