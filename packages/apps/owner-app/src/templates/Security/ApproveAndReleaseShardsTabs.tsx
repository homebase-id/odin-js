import {
  useRemoveNotifications,
  OWNER_APP_ID, useDotYouClient, formatDateExludingYearIfCurrent,
} from '@homebase-id/common-app';
import {useEffect, useState} from 'react';
import {
  approveShardRequest,
  getShardRequestList,
  rejectShardRequest,
  ShardApprovalRequest
} from '../../provider/auth/ShamirProvider';

const ApproveAndReleaseShardsTabs = () => {
  useRemoveNotifications({appId: OWNER_APP_ID});

  const {getDotYouClient} = useDotYouClient();
  const [requests, setRequests] = useState<ShardApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    const client = getDotYouClient();
    const list = await getShardRequestList(client);
    setRequests(list ?? []);
    setLoading(false);
  };

  const handleApprove = async (r: ShardApprovalRequest) => {
    const client = getDotYouClient();
    setError(null);
    try {
      await approveShardRequest(client, r);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message ?? 'The shard could not be released');
    }
    await loadRequests();
  };

  const handleReject = async (r: ShardApprovalRequest) => {
    const client = getDotYouClient();
    await rejectShardRequest(client, {odinId: r.dealer, shardId: r.shardId});
    await loadRequests();
  };

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div className="p-4">
      {error && <div className="mb-3 text-destructive">{error}</div>}
      {loading && <div>Loading shard requests…</div>}
      {!loading && requests.length === 0 && (
        <div>No requests at the moment.</div>
      )}
      {!loading && requests.length > 0 && (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li
              key={r.shardId}
              className="flex items-center justify-between border rounded p-3"
            >
              <div>
                <div className="font-medium">{r.dealer}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDateExludingYearIfCurrent(new Date(r.created))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(r)}
                  className="px-3 py-1 rounded bg-primary text-primary-contrast hover:brightness-90"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(r)}
                  className="px-3 py-1 rounded bg-error-container text-error-container-contrast hover:bg-error-container-hover"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ApproveAndReleaseShardsTabs;