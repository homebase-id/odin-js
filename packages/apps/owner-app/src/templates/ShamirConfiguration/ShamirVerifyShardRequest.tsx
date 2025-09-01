import {
  useRemoveNotifications,
  OWNER_APP_ID, useDotYouClient, formatDateExludingYearIfCurrent,
} from '@homebase-id/common-app';
import {useEffect, useState} from 'react';
import {PageMeta} from '@homebase-id/common-app';
import {Persons} from '@homebase-id/common-app/icons';
import {
  approveShardRequest,
  getShardRequestList,
  rejectShardRequest,
  ShardApprovalRequest
} from '../../provider/auth/ShamirProvider';

const ShamirVerifyShardRequest = () => {
  useRemoveNotifications({appId: OWNER_APP_ID});

  const {getDotYouClient} = useDotYouClient();
  const [requests, setRequests] = useState<ShardApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    setLoading(true);
    const client = getDotYouClient();
    const list = await getShardRequestList(client);
    setRequests(list ?? []);
    setLoading(false);
  };

  const handleApprove = async (r: ShardApprovalRequest) => {
    const client = getDotYouClient();
    await approveShardRequest(client, {odinId: r.player, shardId: r.id});
    await loadRequests();
  };

  const handleReject = async (r: ShardApprovalRequest) => {
    const client = getDotYouClient();
    await rejectShardRequest(client, {odinId: r.player, shardId: r.id});
    await loadRequests();
  };

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <>
      <PageMeta icon={Persons} title={"Verify Shard Requests"}/>
      <div className="p-4">
        {loading && <div>Loading shard requests…</div>}
        {!loading && requests.length === 0 && (
          <div>No shard requests at the moment.</div>
        )}
        {!loading && requests.length > 0 && (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between border rounded p-3"
              >
                <div>
                  <div className="font-medium">{r.player}</div>
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
    </>
  );
};


export default ShamirVerifyShardRequest;