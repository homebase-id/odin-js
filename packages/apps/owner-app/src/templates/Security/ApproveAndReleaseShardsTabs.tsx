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
      {error && <div className="mb-3 text-red-600">{error}</div>}
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
                <div className="text-sm text-gray-500">
                  {formatDateExludingYearIfCurrent(new Date(r.created))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(r)}
                  className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(r)}
                  className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
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