import type { Client } from 'pg';

const expectedPrismaMigrations = [
  ['20241228224006_init', 'a72fe2b56b4487aa1ef746af16b4c55f273c1dd7bd1df37c92e184ab84d70c99'],
  [
    '20250103233230_string_settings_expiration',
    '3c27d3dad8c5ba2193bbfe2a421f02a116e44f06f3f407849e8006d77703934a',
  ],
  ['20250109054202_string_bytes_ms', '3f38824eab3298106f875c47f524c68330fce0ab15abb7e37f696f2c86b21cd5'],
  [
    '20250110223901_website_login_bg_blur',
    '9056c32b78261855c3f9df4cca308e53722c8d9fc60daa10d49fb0e774edceec',
  ],
  ['20250131204021_url_enabled', '7ac94f6fdbb602e3c9241d27ebf5d07298625789fb2cbf8947e0a1d25ee242ed'],
  ['20250213234605_random_words', 'fbff858182f34732c4c4cc0e833ca1b7977d1be089fd4c06c106a31acb877274'],
  [
    '20250304051948_unauthenticated_folder_uploads',
    '474459b9401ad34028cc43dcda4eb5cfea79729cb08e49010c0b7b911e0b3df5',
  ],
  ['20250516022401_version_checking', '0676708d2d42afde8a349fe0ee7222971b582d9e31e7de2cad9eb039eae47866'],
  ['20250607030453_discord_whitelist', '4025122df32431d7853def7c8978b74436397158b1271713e9a3c72faeaaf1e9'],
  [
    '20250607183312_discord_allow_deny_list',
    '01fc8a1582cc3dc7dc168b85901db01f94283e1ee73b73aebd6fc21dbcb58088',
  ],
  ['20250613161158_add_domains', 'ca1ae320d138486c5fda153498fee31f247623fce65c2140c5c63511aef4dcb6'],
  [
    '20250827234055_files_default_compression_format',
    'd844bc7ef8b71d81073148e2d93e082c67194575321a3f0893b3916da4d7bb8e',
  ],
  [
    '20250828035734_features_thumbnails_format',
    '70ef2df83c74af211c017d2458f9b2b45e701dda0e21ab79cd617590ac46f20d',
  ],
  ['20251001031548_core_trust_proxy', '168e7c97568b8c19c86897e4d6ca05b22b1ae316c30319913925df9b1da812e0'],
  ['20251209070242_file_max_expiration', '71b805dd0dd1221b33bfe898ea6646f9cb1d3a227f38b0ec5c0de79833b44735'],
  ['20260108050615_passkeys_overhaul', 'c67672a1d413d82e3f70891c7fd378f013181b7bb333a567f183beb00a4b2d9a'],
  ['20260114063251_clean_thumbnails', '5a75486376d4f16832b2461534e7e17e2a0d7fe33dce7ff5c07992526932f3d9'],
  ['20260114182751_add_nested_folders', '4fc61f141c404d12946ac25193541bcddca0cd3f969b4ba0278e24904f5f69c9'],
  ['20260214054654_revamp_sessions', '574e040b717c99577fd8983d405559f5694e7ecf655d52d06b87fc4a71e2a0dd'],
  ['20260304074731_max_files_per_upload', '5fd521af08a48b51eeae24bbd0d454fcf95f604a79ef2e017ef667566a5b41d6'],
  [
    '20260318172322_file_prop_anonymous_upload',
    '426dc105f4ca2c288f2538f61bfa99e56ef9d3bd98cb3c42afba213609d042f9',
  ],
  [
    '20260406015245_thumbnails_instantaneous',
    '2734b572a52021118d5035e43cf509d83579feadee595dad515ac6725af26874',
  ],
  [
    '20260508022000_add_file_folder_created_at_index',
    'bc81a41eb72f33e1cb9eb3cb230a3de3bd4bceb712565e44b3c7e28c96eae56f',
  ],
  ['20260520163136_files_disabled_types', 'abb131f4969d63d8bca94ed27b135fe3a6beb615096ebaf07e440ca7f9e41f84'],
  ['20260623120000_extensionless_urls', '76777759572c58be10bb01f62439d50dfe644850a603e110b6aa2f8663a47abf'],
  [
    '20260724223042_add_file_user_id_index',
    '55eac6d144cd0db0c2276f7096efa49c35afa3fc153443f915b0887e86a6f169',
  ],
  ['20260806081144_remove_version_api', '08368d44344f934f07757dc014bd3a2022b14a8b377e1f8f5fb2d4836c3dc1ce'],
] as const;

type PrismaMigrationRow = {
  migration_name: string;
  checksum: string;
  finished: boolean;
  applied_steps_count: number;
};

export async function hasPrismaMigrationHistory(client: Client) {
  const result = await client.query<{ exists: boolean }>(
    `SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists`,
  );
  return result.rows[0]?.exists === true;
}

export async function assertCompletePrismaMigrationHistory(client: Client) {
  const result = await client.query<PrismaMigrationRow>(`
    SELECT
      migration_name,
      checksum,
      finished_at IS NOT NULL AS finished,
      applied_steps_count
    FROM public._prisma_migrations
    WHERE rolled_back_at IS NULL
  `);

  const expected = new Map<string, string>(expectedPrismaMigrations);
  const successful = new Set<string>();

  for (const row of result.rows) {
    const expectedChecksum = expected.get(row.migration_name);
    if (!expectedChecksum) throw new Error(`found unknown applied migration ${row.migration_name}`);
    if (row.checksum !== expectedChecksum) {
      throw new Error(`migration ${row.migration_name} has an unknown checksum`);
    }
    if (!row.finished || Number(row.applied_steps_count) < 1) {
      throw new Error(`migration ${row.migration_name} is incomplete or failed`);
    }
    if (successful.has(row.migration_name)) {
      throw new Error(`migration ${row.migration_name} was applied successfully more than once`);
    }

    successful.add(row.migration_name);
  }

  for (const [migrationName] of expectedPrismaMigrations) {
    if (!successful.has(migrationName))
      throw new Error(`expected migration ${migrationName} was not applied`);
  }
}
