import {
  ApiType,
  DotYouClient,
  assertIfDotYouClientIsOwner,
  assertIfDotYouClientIsOwnerOrApp,
} from '../../core/DotYouClient';
import {
  NumberCursoredResult,
  PagedResult,
  PagingOptions,
} from '../../core/DriveData/Query/DriveQueryTypes';
import { stringifyToQueryParams } from '../../helpers/DataUtil';
import {
  ConnectionInfo,
  OdinIdRequest,
  DotYouProfile,
  ActiveConnection,
} from '../circle/CircleDataTypes';

const root = '/circles/connections';

export const disconnectFromContact = (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/disconnect';
  const data: OdinIdRequest = { odinId: odinId };
  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const getConnections = async (
  dotYouClient: DotYouClient,
  data: {
    count: number;
    cursor?: unknown;
  }
): Promise<NumberCursoredResult<ActiveConnection>> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/connected?' + stringifyToQueryParams(data);

  if (dotYouClient.getType() === ApiType.Owner) {
    // Post needed
    return client.post(url).then((response) => {
      return response.data;
    });
  } else {
    return client.get(url).then((response) => {
      return response.data;
    });
  }
};

export const getBlockedConnections = (
  dotYouClient: DotYouClient,
  params: PagingOptions
): Promise<PagedResult<DotYouProfile>> => {
  assertIfDotYouClientIsOwner(dotYouClient);
  const client = dotYouClient.createAxiosClient();
  const url = root + '/blocked?' + stringifyToQueryParams(params);
  return client
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const getConnectionInfo = (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<ConnectionInfo | undefined> => {
  assertIfDotYouClientIsOwnerOrApp(dotYouClient);

  const client = dotYouClient.createAxiosClient();
  const url = root + '/status';

  const data: OdinIdRequest = { odinId: odinId };

  return client
    .post(url, data)
    .then((response) => {
      return {
        ...response.data,
        status: response.data?.status?.toLowerCase(),
        contactData: response.data?.originalContactData,
        originalContactData: undefined,
      };
    })
    .catch(dotYouClient.handleErrorResponse);
};

/**
 * Per circle owned by an app, the connections that could be added to it but are not in it yet.
 *
 * Assigning a circle to an app does not reach back over contacts the owner already reviewed -- a
 * review is a moment, not a standing rule -- so this is the backlog that would otherwise be
 * invisible. Circles with nothing to offer are omitted, so an empty array means nothing to do.
 */
export interface CircleEnrollmentCandidates {
  circleId: string;
  circleName: string;
  /**
   * Why they qualify. The server serializes enums as camelCase strings (JsonStringEnumConverter),
   * never as their numeric values -- comparing against a number silently never matches.
   */
  grantOn: 'none' | 'connect' | 'ownFlowConnect' | 'review';
  candidates: EnrollmentCandidate[];
}

/**
 * One identity that could be added, and the fact that qualifies them. The review date rides along
 * because approving access off a list of bare names is approving on trust.
 */
export interface EnrollmentCandidate {
  odinId: string;
  /** Null on a Connect circle, where connecting rather than reviewing is what qualifies. */
  reviewedAt?: number | null;
}

export type EnrollmentOutcomeKind = 'enrolled' | 'deposited' | 'skipped';

export interface EnrollmentOutcome {
  odinId: string;
  kind: EnrollmentOutcomeKind;
}

/** What a bulk enrolment actually did. A deposit is membership pending, not membership. */
export interface EnrollmentResult {
  enrolled: number;
  deposited: number;
  skipped: number;
  /** Per identity, because "which three were skipped" is the question a count cannot answer. */
  outcomes: EnrollmentOutcome[];
}

export const getEnrollmentCandidates = async (
  dotYouClient: DotYouClient,
  appId: string
): Promise<CircleEnrollmentCandidates[]> => {
  const client = dotYouClient.createAxiosClient();
  return client
    .get<CircleEnrollmentCandidates[]>(`${root}/circles/enrollment-candidates?appId=${appId}`)
    .then((response) => response.data);
};

export const getEnrollmentCandidatesForCircle = async (
  dotYouClient: DotYouClient,
  circleId: string
): Promise<CircleEnrollmentCandidates> => {
  const client = dotYouClient.createAxiosClient();
  return client
    .post<CircleEnrollmentCandidates>(
      `${root}/circles/enrollment-candidates-for-circle`,
      JSON.stringify(circleId),
      { headers: { 'Content-Type': 'application/json' } }
    )
    .then((response) => response.data);
};

export const grantCircleToMany = async (
  dotYouClient: DotYouClient,
  circleId: string,
  odinIds: string[]
): Promise<EnrollmentResult> => {
  const client = dotYouClient.createAxiosClient();
  return client
    .post<EnrollmentResult>(`${root}/circles/add-many`, { circleId, odinIds })
    .then((response) => response.data);
};
