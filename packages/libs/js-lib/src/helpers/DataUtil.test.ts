import { expect, test } from 'vitest';
import {
  roundToLargerMultipleOf16,
  roundToSmallerMultipleOf16,
  stringToUint8Array,
  byteArrayToString,
  byteArrayToNumber,
  toGuidId,
  base64ToUint8Array,
  uint8ArrayToBase64,
  jsonStringify64,
  stringGuidsEqual,
  aclEqual,
  getNewId,
  splitSharedSecretEncryptedKeyHeader,
  mergeByteArrays,
  stringifyToQueryParams,
  stringifyArrayToQueryParams,
  tryJsonParse,
  getQueryModifiedCursorFromTime,
  drivesEqual,
  compareAcl,
} from './DataUtil';
import { SecurityGroupType } from '../core/DriveData/File/DriveFileTypes';

test('Convert string to Uint8Array', () => {
  expect(stringToUint8Array('test')).toEqual(new Uint8Array([116, 101, 115, 116]));
});

test('Convert base64 string to Uint8Array', () => {
  expect(base64ToUint8Array('dGVzdA==')).toEqual(new Uint8Array([116, 101, 115, 116]));
});

test('Convert Uint8Array to base64 string', () => {
  expect(uint8ArrayToBase64(new Uint8Array([116, 101, 115, 116]))).toEqual('dGVzdA==');
});

test('Convert object with Uint8Array to JSON String', () => {
  expect(jsonStringify64({ test: new Uint8Array([116, 101, 115, 116]) })).toEqual(
    '{"test":"dGVzdA=="}'
  );
});

test('Convert Uint8Array to string', () => {
  expect(byteArrayToString(new Uint8Array([116, 101, 115, 116]))).toEqual('test');
});

test('Convert Uint8Array to number', () => {
  expect(byteArrayToNumber(new Uint8Array([116]))).toEqual(116);
});

test('Convert string to a Guid md5 hash', () => {
  expect(toGuidId('default_profile_section')).toBe('66cc60a3b5c2118e03947f2180c7b0d1');
});

test('String guids are equal', () => {
  expect(
    stringGuidsEqual('66cc60a3b5c2118e03947f2180c7b0d1', '66cc60a3b5c2118e03947f2180c7b0d1')
  ).toBe(true);

  expect(
    stringGuidsEqual('75c63766-efa0-4375-9c06-f4696b2d3ede', '75c63766efa043759c06-f4696b2d3ede')
  ).toBe(true);

  expect(
    stringGuidsEqual('75c63766-efa0-4375-9c06-f4696b2d3ede', '75c63766-efa0-4375-9c06-f4696b2d3edf')
  ).toBe(false);

  expect(
    stringGuidsEqual('75c63766efa04375-9c06-f4696b2d3ede', '75c63766-efa0-4375-9c06-f4696b2d3ede')
  ).toBe(true);
});

test('TargetDrives are equal', () => {
  expect(
    drivesEqual(
      { alias: '66cc60a3b5c2118e03947f2180c7b0d1', type: '66cc60a3b5c2118e03947f2180c7b0d1' },
      { alias: '66cc60a3b5c2118e03947f2180c7b0d1', type: '66cc60a3b5c2118e03947f2180c7b0d1' }
    )
  ).toBe(true);

  expect(
    drivesEqual(
      { alias: '66cc60a-3b5c2118e03947f2180-c7b0d1', type: '66cc60a3b5c2118e03947f2-180c7b0d1' },
      { alias: '66cc60a3b5c2118e-03947f2180c7b0d1', type: '66cc60a3-b5c2118e03947f2180c7b0d1' }
    )
  ).toBe(true);

  expect(
    drivesEqual(
      { alias: '66cc60a-3b5c2118e03947f2180-c7b0d1', type: 'be452abd-4d2c-4269-9859-66717bef6e8c' },
      { alias: '66cc60a3b5c2118e-03947f2180c7b0d1', type: '86d81f88-aa9c-4e15-b830-ed82b34be1b4' }
    )
  ).toBe(false);
});

test('ACLs are equal', () => {
  expect(
    aclEqual(
      { requiredSecurityGroup: SecurityGroupType.Anonymous },
      { requiredSecurityGroup: SecurityGroupType.Anonymous }
    )
  ).toBe(true);

  expect(
    aclEqual(
      { requiredSecurityGroup: SecurityGroupType.Anonymous },
      { requiredSecurityGroup: SecurityGroupType.Connected }
    )
  ).toBe(false);

  expect(
    aclEqual(
      { requiredSecurityGroup: SecurityGroupType.Connected },
      { requiredSecurityGroup: SecurityGroupType.Connected }
    )
  ).toBe(true);

  const circleIdA = getNewId();
  const circleIdB = getNewId();
  expect(
    aclEqual(
      { requiredSecurityGroup: SecurityGroupType.Connected },
      {
        requiredSecurityGroup: SecurityGroupType.Connected,
        circleIdList: [circleIdA, circleIdB],
      }
    )
  ).toBe(false);

  expect(
    aclEqual(
      { requiredSecurityGroup: SecurityGroupType.Connected, circleIdList: [circleIdA] },
      {
        requiredSecurityGroup: SecurityGroupType.Connected,
        circleIdList: [circleIdA, circleIdB],
      }
    )
  ).toBe(false);

  expect(
    aclEqual(
      {
        requiredSecurityGroup: SecurityGroupType.Connected,
        circleIdList: [circleIdA, circleIdB],
      },
      {
        requiredSecurityGroup: SecurityGroupType.Connected,
        circleIdList: [circleIdA, circleIdB],
      }
    )
  ).toBe(true);
});

test('Split sharedEncrypted Key Header', () => {
  expect(() => splitSharedSecretEncryptedKeyHeader('dGVzdA==')).toThrow();

  expect(
    splitSharedSecretEncryptedKeyHeader(
      'VxMGovY0Nmmt+i2DauUoIJx5q0Gy/cJEmXlXrAb2i/D1r5jJ4fSP+ZyRsatZto73/KxWPYzvazTBMYyKAPGVCgEAAAA='
    )
  ).toEqual({
    encryptedAesKey: new Uint8Array([
      156, 121, 171, 65, 178, 253, 194, 68, 153, 121, 87, 172, 6, 246, 139, 240, 245, 175, 152, 201,
      225, 244, 143, 249, 156, 145, 177, 171, 89, 182, 142, 247, 252, 172, 86, 61, 140, 239, 107,
      52, 193, 49, 140, 138, 0, 241, 149, 10,
    ]),
    encryptionVersion: 1,
    iv: new Uint8Array([87, 19, 6, 162, 246, 52, 54, 105, 173, 250, 45, 131, 106, 229, 40, 32]),
    type: 11,
  });
});

test('Merge Uint8Arrays', () => {
  expect(
    mergeByteArrays([new Uint8Array([116, 101, 115, 116]), new Uint8Array([246, 139, 240, 245])])
  ).toEqual(new Uint8Array([116, 101, 115, 116, 246, 139, 240, 245]));

  expect(
    mergeByteArrays([new Uint8Array([116, 101]), new Uint8Array([246, 139, 240, 245])])
  ).toEqual(new Uint8Array([116, 101, 246, 139, 240, 245]));

  expect(mergeByteArrays([new Uint8Array([105]), new Uint8Array([201])])).toEqual(
    new Uint8Array([105, 201])
  );
});

test('Round to smaller multiple of 16', () => {
  expect(roundToSmallerMultipleOf16(1032)).toBe(1024);
});

test('Round to larger multiple of 16', () => {
  expect(roundToLargerMultipleOf16(1032)).toBe(1040);
});

test('Stringify object', () => {
  expect(
    stringifyToQueryParams({
      test: 'test',
      test2: 'test2',
    })
  ).toEqual('test=test&test2=test2');
});

test('Stringify complex QueryParams', () => {
  expect(
    stringifyToQueryParams({
      test: 'test',
      testObject: {
        abc: 123,
        def: 'test',
      },
      array: ['test', 'test2'],
      mixedArray: ['test', 'test2', 123],
    })
  ).toEqual(
    'test=test&abc=123&def=test&array=test&array=test2&mixedArray=test&mixedArray=test2&mixedArray=123'
  );

  expect(
    stringifyToQueryParams({
      test: 'test',
    })
  ).toEqual('test=test');
});

test('Stringify complex QueryParams arrays', () => {
  expect(
    stringifyArrayToQueryParams([
      {
        test: 'test',
        testObject: {
          abc: 123,
          def: 'test',
        },
        array: ['test', 'test2'],
        mixedArray: ['test', 'test2', 123],
      },
    ])
  ).toEqual(
    '[0].test=test&[0].abc=123&[0].def=test&[0].array=test&[0].array=test2&[0].mixedArray=test&[0].mixedArray=test2&[0].mixedArray=123'
  );

  expect(
    stringifyArrayToQueryParams([
      {
        test: 'test',
      },
    ])
  ).toEqual('[0].test=test');

  expect(stringifyArrayToQueryParams([{ test: 'test' }, { test: 'test' }])).toEqual(
    '[0].test=test&[1].test=test'
  );

  expect(
    stringifyArrayToQueryParams([
      { test: 'test', complexObjectA: { 123: 'abc' } },
      { test: 'test', deeperLevelArray: ['testDeeper', 'even further down'] },
    ])
  ).toEqual(
    '[0].test=test&[0].123=abc&[1].test=test&[1].deeperLevelArray=testDeeper&[1].deeperLevelArray=even%20further%20down'
  );
});

test('JSON.parse', () => {
  expect(tryJsonParse('{"test":"test"}')).toEqual({ test: 'test' });

  const objectwithArray = { test: 'test', deeperLevelArray: ['testDeeper', 'even further down'] };
  expect(tryJsonParse(JSON.stringify(objectwithArray))).toEqual(objectwithArray);
});

test('getQueryModifiedCursorFromTime', () => {
  expect(getQueryModifiedCursorFromTime(1712833436831)).toEqual(JSON.stringify({"time": 1712833436831, "row": null }));
});

test('compareAcl', () => {
  expect(
    compareAcl(
      { requiredSecurityGroup: SecurityGroupType.Connected },
      { requiredSecurityGroup: SecurityGroupType.Connected }
    )
  ).toBe(0);

  expect(
    compareAcl(
      { requiredSecurityGroup: SecurityGroupType.Owner },
      { requiredSecurityGroup: SecurityGroupType.Connected }
    )
  ).toBe(-1);

  expect(
    compareAcl(
      { requiredSecurityGroup: SecurityGroupType.Connected },
      { requiredSecurityGroup: SecurityGroupType.Owner }
    )
  ).toBe(1);

  expect(
    compareAcl(
      { requiredSecurityGroup: SecurityGroupType.Connected },
      { requiredSecurityGroup: SecurityGroupType.Connected, circleIdList: ['test'] }
    )
  ).toBe(1);

  expect(
    compareAcl(
      { requiredSecurityGroup: SecurityGroupType.Connected, circleIdList: ['test'] },
      { requiredSecurityGroup: SecurityGroupType.Connected, circleIdList: ['test'] }
    )
  ).toBe(0);

  expect(
    compareAcl(
      { requiredSecurityGroup: SecurityGroupType.Connected, circleIdList: ['test'] },
      { requiredSecurityGroup: SecurityGroupType.Connected, circleIdList: ['test', 'test2'] }
    )
  ).toBe(-1);

  const aclArrayToSort = [
    { requiredSecurityGroup: SecurityGroupType.Anonymous },
    { requiredSecurityGroup: SecurityGroupType.Owner },
    { requiredSecurityGroup: SecurityGroupType.Authenticated },
    { requiredSecurityGroup: SecurityGroupType.Connected },
  ];

  expect(aclArrayToSort.sort(compareAcl)).toEqual([
    { requiredSecurityGroup: SecurityGroupType.Owner },
    { requiredSecurityGroup: SecurityGroupType.Connected },
    { requiredSecurityGroup: SecurityGroupType.Authenticated },
    { requiredSecurityGroup: SecurityGroupType.Anonymous },
  ]);
});
